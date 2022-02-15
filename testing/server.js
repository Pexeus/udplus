const udplus = require("../index")
const server = udplus.createServer()
const fs = require("fs")

console.log("--- SERVER ----");


server.listen(3000, info => {
    console.log("listening on: " + info);
})

server.on("connection", client => {
    console.log("client connected: ", client.address);

    client.on("test", data => {
        console.log(data);
    })
})

server.on("test", data => {
    //console.log(data);
})