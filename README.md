# udplus
This Package offers a simple and easy to set up wrapper around Nodes internal "dgram" Module. It offers server and client side Functions. The API is inspired by the "Socket.io" Package.

## Creating a Server

    const  udplus = require("udplus")
    const  server = udplus.createServer(port)
    
    server.listen(3000, info  => {
		console.log("listening on: " + info);
	})
	
	client.on("connection", info  => {
		console.log(info);
	})

## Connecting to local Server

    const  udplus = require("udplus")
    const  client = udplus.createClient()
    
    client.connect("localhost", 3000, info  => {
	    console.log(info);
	})

 ## Sending Data from Client to Server

    client.emit("custom-event", "Hello World")
## Recieving Data from Client on Server

    server.on("custom-event", data  => {
	    console.log(data);
	})

