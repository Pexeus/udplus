from events import EventEmitter
import socket
import time
import threading

class Client(EventEmitter):
    def __init__(self):
        print("initializing client...")

        #initialize event handler
        super(Client, self).__init__()
        
        # markers
        self.signature = str.encode("______")
        self.splitter = str.encode("||__||")
        self.reserved = [self.signature, self.splitter, "connection", "disconnected", "keep-alive"]

        #self.splitAt(str.encode("123|4546||__||stringus"), self.splitter)

        

    def connect(self, host, port):
        #state
        self.connected = False

        # CHANGE: set timeot to servers timeout
        self.timeout = 2

        self.bufferSize = 1024

        self.host = host
        self.port = port

        self.socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
        
        # CHANGE: start after connection established
        self.heartbeatThread = threading.Thread(target=self.heartbeat, daemon=True)
        self.heartbeatThread.start()

        try:
            # main loop
            while True:
                try:
                    rawData, addr = self.socket.recvfrom(self.bufferSize)
                    self.connected = True

                    decoded = True

                    try:
                        channel, datatype, data = self.decode(rawData)
                    except:
                        print("failed to decode Data:")
                        print(rawData)

                        decoded = False

                    if decoded == True:
                        self.emit(channel, data)
                    
                except:
                    # Fails if there is no connection
                    # -> attempt to (re)connect

                    self.connected = False
                    self.dispatch("keep-alive", "ja aber hallo erst mal")

                time.sleep(1)

        except KeyboardInterrupt:
            print("interrupted")
    
    def decode(self, buf):
        # check if the signature is in place
        signature = buf[0:len(self.signature)]

        if (signature == self.signature):
            #split head/body
            channel, body = self.splitAt(buf[len(self.signature):len(buf)], self.splitter)

            #split datatype/data
            datatype, data = self.splitAt(body, self.signature)

            return channel.decode("utf-8"), datatype.decode("utf-8"), data
            

    def splitAt(self, buf, split):
        splitPos = 0
        
        start = 0
        end = 0
        index = 0

        for i in buf:
            if len(split) == splitPos:
                end = index
                break

            if i == split[splitPos]:
                if splitPos == 0:
                    start = index

                splitPos += 1
            else:
                splitPos = 0
            
            index += 1

        if end == 0:
            return False

        return buf[0:start], buf[end:len(buf)]

    def encode(self, channel, data):
        dataBuf = False
        datatype = False

        # ! more datatypes
        if (type(data) == str):
            datatype = "string"
            dataBuf = str.encode(data)

        if (dataBuf != False and datatype != False):
            # head
            marker = self.signature + str.encode(channel) + self.splitter + str.encode(datatype) + self.signature

            # packet
            return (marker + dataBuf)
        else: 
            print("encoding failed:")
            print(channel, data)

            return False

    def dispatch(self, channel, data):
       buf = self.encode(channel, data)
       self.socket.sendto(buf, (self.host, self.port))


    def heartbeat(self):
            # if there is an active connection, send a heartbeat
            while True:
                if (self.connected == True):
                    self.dispatch("keep-alive", "ja aber hallo erst mal")
                
                time.sleep(self.timeout / 2)


