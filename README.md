

# udplus

**⚠️ WORK IN PROGRESS ⚠️**

This Package offers a simple and easy to set up wrapper around Nodes internal "dgram" Module. It offers server and client side Functions. The API is inspired by the "Socket.io" Package.

## Creating a Server

    const  udplus = require("udplus")
    const  server = udplus.createServer()
    
    server.listen(3000, info  => {
		console.log("listening on: " + info);
	})

## Connecting Client to local Server

    const  udplus = require("udplus")
    const  client = udplus.createClient()
    
    client.connect("localhost", 3000, info  => {
	    console.log("connected!", info);
	})

## Sending and Recieving data on Server
```
//emits for each connected client
server.on("connection", client  => {
	console.log("client connected: ", client.address);
	
	//Recieve data from THIS client
	client.on("custom-event", data  => {
		console.log(data);
	})
	
	//send data to THIS client
	client.emit("custom-event", data)
})
```

## Sending and Recieving data on Client
```
//send from client to server
client.emit("custom-event", "Hello World")

//recieve from server
client.on("test", data  => {
	console.log(data);
})
```
