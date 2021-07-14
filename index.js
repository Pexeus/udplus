const udp = require('dgram');
const EventEmitter = require('events');

const signature = Buffer.from("______")
const splitter = Buffer.from("||")
var timeout = 3000
const reserved = [signature, splitter, "connection", "disconnected", "keep-alive"]
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
        console.log(message);
    }
}

function encode(channel, data) {
    let buf = data
    let datatype = typeof(data)

    if (!Buffer.isBuffer(buf)) {
        if (typeof(buf == "object")) {
            buf = Buffer.from(JSON.stringify(buf))
        }
        else {
            buf = Buffer.from(buf)
        }
    }
    else {
        datatype = "buffer"
    }

    const marker = Buffer.concat([signature, Buffer.from(channel), splitter, Buffer.from(datatype), signature])


    return Buffer.concat([marker, buf])
}

function checkSignature(buffer) {
    const check = buffer.slice(0, signature.length)

    if (String(check) == String(signature)) {
        return true
    }

    return false
}

function decodeData(data, type) {
    if (type == "buffer") {
        return data
    }
    if (type == "string") {
        return String(data).slice(1,-1)
    }
    if (type == "object") {
        return JSON.parse(String(data))
    }
    if (type == "number") {
        return Number(data)
    }

    return data
}

function decode(buffer) {
    if (checkSignature(buffer)) {
        const noSignature = buffer.slice(signature.length, buffer.length)

        const metadata = String(noSignature.slice(0, noSignature.indexOf(signature))).split("||")
        const data = noSignature.slice(noSignature.indexOf(signature) + signature.length, noSignature.length)

        const channel = metadata[0]
        const datatype = metadata[1]
        const decodedData = decodeData(data, datatype)

        return {channel: channel, datatype: datatype, data: decodedData}
    }
    else {
        return buffer
    }
}

function createClient() {
    const client = udp.createSocket("udp4")
    const events = new EventEmitter();
    const connection = {}

    function internalAction(data, info) {
        if (data.channel == "connection") {
            log(`connection established with ${info.address}:${info.port}`)

            timeout = data.data
        }
        if (data.channel == "disconnected") {
            log(`connection with ${info.address}:${info.port} timed out`)
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

        log(`Message recieved from ${info.address}:${info.port}`)
        
        if (data != undefined) {
            if (reserved.includes(data.channel)) {
                internalAction(data, info)
            }
        }
    })

    events.emit = (channel, data) => {
        dispatch(channel, data)
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

    function registerClient(data, client) {
        let registered = false

        for (const knownClient of clients) {
            if (client.address == knownClient.address) {
                registered = true

                knownClient.address = client.address
                knownClient.port = client.port
                knownClient.lastSignal = Date.now()
            }
        }

        if (!registered) {
            const newClient = {
                address: client.address,
                port: client.port,
                lastSignal: Date.now(),
            }

            clients.push(newClient)

            events.emit("connection", newClient)
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

    server.on("error", err => {
        console.log(`UDP Server has errored: ${err}`);
    })

    server.on("message", (buffer, info) => {
        const data = decode(buffer)

        if (typeof data === "object") {
            registerClient(data, info)
            events.emit(data.channel, data.data)
        }
    })

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