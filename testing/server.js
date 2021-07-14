const udplus = require("../index")
const server = udplus.createServer()
const fs = require("fs")


server.listen(3000, info => {
    console.log("listening on: " + info);
})

server.on("connection", client => {
    console.log("client connected: ", client.address);
})

server.on("test", data => {
    //console.log(data);
})