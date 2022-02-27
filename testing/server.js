const udplus = require("../index")
const server = udplus.createServer()
const fs = require("fs")

const image = fs.readFileSync("./img.jpg")

console.log("--- SERVER ----");

server.listen(3000, info => {
    console.log("listening on: " + info);
})

server.on("connection", client => {
    console.log("client connected: ", client.address);

    client.on("c2s", data => {
        console.log(data);
    })
})

server.on("raw", data => {
    console.log(String(data));
})