from udplus import Client
import time

client = Client()

def check(data):
    print(type(data), data)

client.on("check", check)

client.connect("127.0.0.1", 3000, True)

try:
    while True:
        time.sleep(1)
        #print("->")
        client.emit("c2s", 420)
except KeyboardInterrupt:
    print("interrupted main")


