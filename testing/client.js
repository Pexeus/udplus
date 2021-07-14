const udplus = require("../index")
const client = udplus.createClient()
const fs = require("fs")

client.connect("localhost", 3000, info => {
    console.log(info);
})

client.on("connection", info => {
    console.log(info);
})

const image = fs.readFileSync("./testing/image.png")
