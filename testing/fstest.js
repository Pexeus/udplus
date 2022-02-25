const { log } = require('console');
const fs = require('fs');

const data = fs.readFileSync("./large.jpg")

console.log(data.length);