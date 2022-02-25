const signature = Buffer.from("[udplus]")

function decode(buffer) {
    const head = buffer.slice(0, signature.length)
    const isUdplus = Buffer.compare(head, signature) === 0

    if (!isUdplus) {
        return {
            channel: "raw",
            datatype: "buffer",
            dat: buffer
        }
    }

    const headerLength = Number(buffer.slice(signature.length, signature.length + 4))
    const metadataRaw = String(buffer.slice((4 + signature.length), headerLength))
    const dataBuffer = buffer.slice(headerLength, buffer.length)
    const metadata = []
    
    for (const entry of metadataRaw.split("|")) {
        metadata.push(entry)
    }

    const packet = {channel: metadata[0], datatype: metadata[1], data: undefined}

    //bufer
    if (packet.datatype == "buffer") {
        packet.data = dataBuffer
        return packet
    }

    //string
    if (packet.datatype == "string") {
        packet.data = String(dataBuffer)
        return packet
    }

    //number
    if (packet.datatype == "number") {
        packet.data = Number(dataBuffer)
        return packet
    }
    
    //object/json
    if (packet.datatype == "object") {
        packet.data = JSON.parse(String(dataBuffer))
        return packet
    }

    console.log(packet);
}

function encode(channel, data) {
    let datatype = false
    let buffer

    //encode data
    if (Buffer.isBuffer(data)) {
        datatype = "buffer"
    }

    if (!datatype) {
        datatype = typeof(data)
    }

    if (datatype != "buffer") {
        if (datatype == "object") {
            buffer = Buffer.from(JSON.stringify(data))
        }
        else {
            //maybe problematisch
            buffer = Buffer.from(String(data))
        }
    }

    //create header
    const header = encodeHeader(channel, datatype)

    const packet = Buffer.concat([header, buffer])
    
    return packet
}

function encodeHeader(channel, datatype, custom) {
    let length
    let metadata = ""

    if (!checkString(channel)) {
        console.log("invalid channel");
        return false
    }

    addMetadata(channel)
    addMetadata(datatype)

    if (custom != undefined) {
        for (const str of custom) {
            if (checkString(str)) {
                //addMetadata(str)
            }
        }
    }

    function addMetadata(str) {
        if (metadata.length > 0) {
            metadata += "|"
        }

        metadata += str
    }

    function fixNrLength(nr) {
        let str = String(nr)

        while (str.length < 4) {
            str = "0" + str
        }

        return str
    }

    const metaBuffer = Buffer.from(metadata)
    const headerLengthString = fixNrLength(metaBuffer.length + signature.length + 4)
    const header = Buffer.concat([signature, Buffer.from(headerLengthString), metaBuffer])    

    return header
}

function checkString(str) {
    if (typeof(str) != "string") {
        return false
    }

    if (str.includes("|")) {
        return false
    }

    return true
}

packet = encode("test", 1231232)
console.log(decode(packet));
