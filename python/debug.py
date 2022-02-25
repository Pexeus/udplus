from udplus import Client

client = Client()

def handle(data):
    print(data)


client.on("test", handle)

client.connect("127.0.0.1", 3000)