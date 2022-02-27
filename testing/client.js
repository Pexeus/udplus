const udplus = require("../index")
const client = udplus.createClient()
const fs = require("fs")

console.log("--- CLIENT ----");


client.connect("localhost", 3000, info => {
    console.log(`connected to ${info}`);

    client.on("broadcast", data => {
        console.log(data);
    })
})