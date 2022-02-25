const udplus = require("../index")
const client = udplus.createClient()
const fs = require("fs")

const bigdata = fs.readFileSync("./testing/fhd.jpg")

console.log("--- CLIENT ----");


client.connect("localhost", 3000, info => {
    console.log(`connected to ${info}`);

    client.on("broadcast", data => {
        console.log(data);
    })
})