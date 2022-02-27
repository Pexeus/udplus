const udp = require('dgram');
const EventEmitter = require('events');

const signature = Buffer.from("[udplus]")
var timeout = 3000
const reserved = ["connection", "disconnected", "keep-alive", "|"]
var logging = true



module.exports = {
    createServer: () => {
        return createServer()
    },
    createClient: () => {
        return createClient()
    },
    logging: option => {
        logging = option
    }
}

function log(message) {
    if (logging) {
        console.log(`[udplus]`, message);
    }
}

function decode(buffer) {
    const head = buffer.slice(0, signature.length)
    const isUdplus = Buffer.compare(head, signature) === 0

    if (!isUdplus) {
        return {
            channel: "raw",
            datatype: "buffer",
            data: buffer
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
    else {
        buffer = data
    }

    //check buffer length
    if (buffer.length > 65000) {
        throw new Error("Message too large: Max Buffer size is 65000 bytes")
    }

    //create header
    const header = encodeHeader(channel, datatype)
    const packet = Buffer.concat([header, buffer])
    
    return packet
}

function encodeHeader(channel, datatype, custom) {
    let metadata = ""

    addMetadata(channel)
    addMetadata(datatype)

    if (custom != undefined) {
        for (const str of custom) {
            if (checkString(str)) {
                addMetadata(str)
            }
            else {
                throw new Error(`Invalid channel name ${channel} Illegal channel names/chars: ${reserved}`)
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

    for (const internal of reserved) {
        if (str.includes(internal)) {
            return false
        }
    }

    return true
}

function createClient() {
    const client = udp.createSocket("udp4")
    const events = new EventEmitter();
    const connection = {}

    //scuffed naming fix
    events.dispatch = events.emit

    function internalAction(data, info) {
        if (data.channel == "connection") {
            log(`connection established with ${info.address}:${info.port}`)

            timeout = data.data
        }
    }

    events.connect = (address, port, callback) => {
        connection.address = address
        connection.port = port

        keepAlive()

        callback(`${address}:${port}`)
    }

    client.on("message", (buffer, info) => {
        const data = decode(buffer)
        
        if (data != undefined) {
            if (reserved.includes(data.channel)) {
                internalAction(data, info)
            }
            else {
                log(`Message recieved from ${info.address}:${info.port}`)
                events.dispatch(data.channel, data.data)
            }
        }
    })

    events.emit = (channel, data) => {
        if (checkString(channel)) {
            dispatch(channel, data)
        }
        else {
            throw new Error(`Invalid channel name ${channel} Illegal channel names/chars: ${reserved}`)
        }
    }

    function dispatch(channel, data) {
        const packet = encode(channel, data)

        client.send(packet, connection.port, connection.address, err => {
            if (err) {
                console.log(err);
            }
        })
    }

    function keepAlive() {
        setInterval(() => {
            dispatch("keep-alive", Date.now())
        }, Math.round(timeout / 2));
    }

    return events
}

function createServer() {
    const server = udp.createSocket("udp4")
    const events = new EventEmitter();
    const clients = []

    //scuffed naming fix
    events.dispatch = events.emit

    function registerClient(data, client) {
        let registered = false

        for (const knownClient of clients) {
            if (client.address == knownClient.address) {
                registered = true
                const knownPort = knownClient.port

                knownClient.address = client.address
                knownClient.port = client.port
                knownClient.lastSignal = Date.now()

                if (knownPort != client.port) {
                    dispatch("connection", timeout, knownClient)
                }
            }
        }

        if (!registered) {
            //create event emitter for client
            const newClient = new EventEmitter()
            
            //scuffed naming fix
            newClient.dispatch = newClient.emit

            newClient.emit = (channel, data) => {
                if (clients.includes(newClient)) {
                    if (checkString(channel)) {
                        dispatch(channel, data, newClient)
                    }
                    else {
                        throw new Error(`Invalid channel name ${channel} Illegal channel names/chars: ${reserved}`)
                    }
                }
            }

            newClient.address = client.address
            newClient.port = client.port
            newClient.lastSignal = Date.now()

            clients.push(newClient)

            events.dispatch("connection", newClient)
            dispatch("connection", timeout, newClient)
        }
    }

    function dispatch(channel, data, client) {
        const packet = encode(channel, data)

        server.send(packet, client.port, client.address, err => {
            if (err) {
                console.log(err);
            }
            else {
                log(`Data Sent to ${client.address}:${client.port}`)
            }
        })
    }

    function getClient(info) {
        for (const client of clients) {
            if (client.address == info.address && client.port == info.port) {
                return client;
            }
        }

        return false;
    }

    server.on("error", err => {
        console.log(`UDP Server has errored: ${err}`);
    })

    server.on("message", (buffer, info) => {
        const data = decode(buffer)

        //log(`Data received from: ${info.address}`)

        if (typeof data === "object") {
            registerClient(data, info)

            //emit on main emitter
            events.dispatch(data.channel, data.data)

            //emit on client object
            const client = getClient(info)
            
            if (client) {
                client.dispatch(data.channel, data.data)
            }
        }
    })

    //broadcast message to all clients
    events.emit = (channel, data) => {
        if (checkString(channel)) {
            for (const c of clients) {
                dispatch(channel, data, c)
            }
        }
        else {
            throw new Error(`Invalid channel name ${channel} Illegal channel names/chars: ${reserved}`)
        }
    }

    events.listen = (port, callback) => {
        server.bind(port, "0.0.0.0", () => {
            var address = server.address();
            callback(`${address.address}:${address.port}`);
        });
    }

    setInterval(() => {
        for (const client of clients) {
            if (client.lastSignal + timeout < Date.now()) {
                log("client disconnected: " + client.address)
                clients.splice(clients.indexOf(client), 1)
            }
        }
    }, 2000);

    return events
}