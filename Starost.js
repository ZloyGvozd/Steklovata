const netTools = require("./netTools")
const { SocksClient } = require('socks');
const index = require("./index")

function send(proxy_ip,proxy_port,currentIp,currentPort,num,id){
    const tools = new netTools()
    let client = null
    let done = false

    const finish = () => {
        if (done) return
        done = true
        if (client && !client.destroyed) client.destroy()
    }

    const options = {
        proxy: { host: proxy_ip, port: proxy_port, type: 5 },
        command: 'connect',
        destination: { host: currentIp, port: currentPort },
        timeout: 60000
    };
    console.log(proxy_ip,proxy_port,currentIp,currentPort,num,id)
    SocksClient.createConnection(options).then((info) => {
        console.log("connected")
        client = info.socket
        client.setTimeout(60000, () => finish())
        const address_name = Buffer.from(currentIp, 'ascii')
        let handshakeBuilder = [0x00, ...tools.writeVarInt(773), address_name.length, ...address_name, ...tools.bigEndian(currentPort), 0x01]
        handshakeBuilder = [...tools.writeVarInt(handshakeBuilder.length)].concat(handshakeBuilder)
        client.write(new Uint8Array([...handshakeBuilder,...[0x01, 0x00]]))

        let buffer = new Uint8Array(0)
        client.on("data", async (data) => {
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
                    //здесь удачу
                    //console.log("da nu")
                    index.serverResponse({reason:'serverResponse',json:jsonObject,server:{ip:currentIp,port:currentPort}, debug:jsonString, num:num, ID: id})
                } catch (e) {
                    //console.error(e)
                    //здесь ошибки
                    //await index.serverError({num:num, ID: id})
                }
                if(client && !client.destroyed) {
                    client.destroy(); // Закрываем сокет
                }
                finish()
            }
        })

        client.on('error', (err) => {
            console.error(`[Net Error]: ${err.code} - ${err.message}`);
            if(client && !client.destroyed) {
                client.destroy(); // Закрываем сокет
            }
            finish()
        });

        client.on("close", (e) => {
            if(client && !client.destroyed) {
                client.destroy(); // Закрываем сокет
            }
            finish()
        })
    }).catch((e) => {
        console.log(e)
        finish()
    })
}
console.log("nit")
exports.send = send