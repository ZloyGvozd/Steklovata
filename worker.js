const { workerData, parentPort } = require('worker_threads');
const netTools = require("./netTools")
const net = require("node:net");

const {workerId, startIdx, endIdx, hosts, startPort, portsCount} = workerData;

function getShuffledPortOffset(index, max) {
    // Используем простую хэш-функцию (Knuth's multiplicative method)
    // Число 2654435761 — это золотое сечение для 32-битных чисел, отлично распределяет
    const hash = Math.imul(index, 2654435761);
    return Math.abs(hash) % max;
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

async function run() {
    for (let i = startIdx; i <= endIdx; i++) {
        const ipIndex = Math.floor(i / portsCount);
        const currentIp = hosts[ipIndex];

        const sequentialPortOffset = i % portsCount;
        const randomPortOffset = getShuffledPortOffset(sequentialPortOffset, portsCount);

        const currentPort = startPort + randomPortOffset;
        console.log(`${currentIp}:${currentPort}`)

        const tools = new netTools()

        await new Promise((resolve) => {
            let isFinished = false;
            const finish = () => {
                if (!isFinished) {
                    isFinished = true;
                    clearTimeout(timeoutId);
                    client.destroy(); // Закрываем сокет
                    resolve(); // Разрешаем промис, цикл идет к следующей итерации
                }
            };

            const timeoutId = setTimeout(() => {
                console.log(`[Timeout]: ${currentIp}:${currentPort}`);
                finish();
            }, 5000);

            const client = net.createConnection({host: currentIp, port: currentPort}, () => {
                const address_name = Buffer.from(currentIp, 'ascii')
                let handshakeBuilder = [0x00, ...tools.writeVarInt(773), address_name.length, ...address_name, ...tools.bigEndian(currentPort), 0x01]
                handshakeBuilder = [...tools.writeVarInt(handshakeBuilder.length)].concat(handshakeBuilder)
                client.write(new Uint8Array([...handshakeBuilder,...[0x01, 0x00]]))
            })

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
                        console.log(jsonObject.players.online, jsonObject.players.sample,jsonObject.description)
                    } catch (e) {
                        console.error(e)
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
        })

        await new Promise(r => setTimeout(r, getRandomArbitrary(3000,6000)));
    }
}

run();