const udplus = require("../index")
const server = udplus.createServer()
const fs = require("fs")

console.log("--- SERVER ----");

server.listen(3000, info => {
    console.log("listening on: " + info);
})

server.on("connection", client => {
    console.log("client connected: ", client.address);

    client.emit("keepalive", "jadjasdj")

    client.on("testus", data => {
        console.log(data);
    })

    setInterval(() => {
        server.emit("broadcast", {hallo: "jawoo"})
    }, 1000);
})

server.on("raw", data => {
    console.log(String(data));
})