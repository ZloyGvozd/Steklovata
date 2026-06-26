class NetTools{
    writeVarInt(value) {
        const bytes = [];
        let v = value | 0;

        while (true) {
            if ((v & ~0x7F) === 0) {
                bytes.push(v);
                break;
            }
            bytes.push((v & 0x7F) | 0x80);
            v >>>= 7;
        }
        return new Uint8Array(bytes);
    }
    readVarInt(buf) {
        let value = 0;
        let shift = 0;
        let bytesRead = 0;

        while (bytesRead < buf.length) {
            const byte = buf[bytesRead++];
            value |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) {
                return { value, bytesRead };
            }
            shift += 7;
            if (shift >= 35) throw new Error('VarInt too big');
        }
        return null;
    }

    bigEndian(value){
        const byte1 = Math.floor(value / 256); // Старший байт
        const byte2 = value % 256;             // Младший байт
        return [byte1,byte2]
    }
}

module.exports = NetTools