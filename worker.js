const { workerData, parentPort } = require('worker_threads');
const netTools = require("./netTools")
const net = require("node:net");
const { SocksClient } = require('socks');

const {workerId, startIdx, endIdx, hosts, startPort, portsCount, proxy_ip, proxy_port} = workerData;

function getShuffledPortOffset(index, max, salt) {
    // Используем простую хэш-функцию (Knuth's multiplicative method)
    // Число 2654435761 — это золотое сечение для 32-битных чисел, отлично распределяет
    const hash = Math.imul(index+salt, 2654435761);
    return Math.abs(hash) % max;
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

async function run() {
    const salt = Math.floor(Math.random() * 1000000);
    for (let i = startIdx; i <= endIdx; i++) {
        const ipIndex = Math.floor(i / portsCount);
        const currentIp = hosts[ipIndex];

        const sequentialPortOffset = i % portsCount;
        const randomPortOffset = getShuffledPortOffset(sequentialPortOffset, portsCount, salt);

        const currentPort = startPort + randomPortOffset;
        //console.log(`${currentIp}:${currentPort}`)

        const tools = new netTools()

        await new Promise((resolve) => {
            let isFinished = false;
            let client = null

            const finish = (client) => {
                if (!isFinished) {
                    isFinished = true;
                    clearTimeout(timeoutId);
                    if(client && !client.destroyed) {
                        client.destroy(); // Закрываем сокет
                    }
                    resolve(); // Разрешаем промис, цикл идет к следующей итерации
                }
            };

            const timeoutId = setTimeout(() => {
                console.log(`[Timeout]: ${currentIp}:${currentPort}`);
                parentPort.postMessage({reason:'serverTimeout'})
                finish();
            }, 10000);

            const options = {
                proxy: { host: proxy_ip, port: parseInt(proxy_port), type: 5 },
                command: 'connect',
                destination: { host: currentIp, port: currentPort },
                timeout: 60000
            };

            SocksClient.createConnection(options).then((info) => {
                client = info.socket
                const address_name = Buffer.from(currentIp, 'ascii')
                let handshakeBuilder = [0x00, ...tools.writeVarInt(773), address_name.length, ...address_name, ...tools.bigEndian(currentPort), 0x01]
                handshakeBuilder = [...tools.writeVarInt(handshakeBuilder.length)].concat(handshakeBuilder)
                client.write(new Uint8Array([...handshakeBuilder,...[0x01, 0x00]]))

                let buffer = new Uint8Array(0)
                client.on("data", (data) => {
                    const buffer_new = new Uint8Array(buffer.length + data.length)
                    buffer_new.set(buffer,0)
                    buffer_new.set(data,buffer.length)
                    buffer = buffer_new
                    const varInt = tools.readVarInt(buffer)
                    const packet = buffer.subarray(varInt.bytesRead)
                    if(packet.length === varInt.value) {
                        try {
                            const stringLengthVarInt = tools.readVarInt(packet.subarray(1))
                            const jsonStartOffset = 1 + stringLengthVarInt.bytesRead;
                            const jsonBytes = packet.subarray(jsonStartOffset, jsonStartOffset + stringLengthVarInt.value)


                            const decoder = new TextDecoder('utf-8');
                            const jsonString = decoder.decode(jsonBytes);
                            //console.log(jsonString)

                            const jsonObject = JSON.parse(jsonString);
                            //console.log(jsonObject)
                            //console.log(jsonObject.players.online, jsonObject.players.sample,jsonObject.description)
                            parentPort.postMessage({reason:'serverResponse',json:jsonObject,server:{ip:currentIp,port:currentPort}})
                        } catch (e) {
                            console.error(e)
                            parentPort.postMessage({reason:'serverError'})
                        }
                        finish()
                    }
                })

                client.on('error', (err) => {
                    console.error(`[Net Error]: ${err.code} - ${err.message}`);
                    finish()
                });

                client.on("close", () => {
                    finish()
                })
            }).catch((e) => {console.log(e)})
        })

        await new Promise(r => setTimeout(r, getRandomArbitrary(3000,6000)));
    }
}

parentPort.on('message',(data)=>{
    if(data.task === 'stop'){
        process.exit(0)
    }
})

run();