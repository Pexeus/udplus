from distutils.log import error
from events import EventEmitter
import socket
import time
import threading
import json

class Client(EventEmitter):
    def __init__(self):
        print("initializing client...")

        #initialize event handler
        super(Client, self).__init__()
        
        # markers
        self.signature = str.encode("[udplus]")
        self.reserved = ["|", "connection", "disconnected", "keep-alive"]

        #self.splitAt(str.encode("123|4546||__||stringus"), self.splitter)

    def connect(self, host, port, daemon=False):
        #state
        self.connected = False

        # CHANGE: set timeot to servers timeout
        self.timeout = 2

        self.bufferSize = 65000

        self.host = host
        self.port = port

        self.socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)

        # start reciever thread
        if daemon == True:
            self.recieverThread = threading.Thread(target=self.recieve, daemon=True)
            self.recieverThread.start()
        else:
            self.recieve()
    
    def emit(self, channel, data):
        if (channel in self.reserved):
            print("Error: channel {} is reserved".format(channel))
        else:
            self.dispatch(channel, data)

    def dispatch(self, channel, data):
        buf = self.encode(channel, data)

        try:
            self.socket.sendto(buf, (self.host, self.port))
        except Exception as e:
            print(e)

    

    def recieve(self):
        try:
            # main loop
            while True:
                try:
                    # errors if there hasnt been any connection
                    rawData, addr = self.socket.recvfrom(self.bufferSize)
                    
                    # manage connection state
                    if (self.connected == False):
                        print("connected to {}:{}".format(self.host, self.port))
                        self.connected = True

                        #start heartbeat thread
                        self.heartbeatThread = threading.Thread(target=self.heartbeat, daemon=True)
                        self.heartbeatThread.start()

                    # decoding
                    channel, data, metadata = self.decode(rawData)
                    
                    if channel in self.reserved:
                        #TODO: Handle internal packages
                        print("internal package ", channel)
                    else:
                        self.emitEvent(channel, data)

                except Exception as e:
                    if self.connected == True:
                        self.connected = False
                        print("lost connection to {}:{}".format(self.host, self.port))
                        print(e)

                    self.dispatch("keep-alive", time.time())
                    time.sleep(1)

        except KeyboardInterrupt:
            print("interrupted")

    def encode(self, channel, data):
        datatype = type(data).__name__
        packetDatatype = False
        body = False

        if datatype != "bytes":
            if (datatype == "str"):
                packetDatatype = "string"
                body = str.encode(data)
            
            if (datatype == "list"):
                packetDatatype = "object"
                body = str.encode(str(data)) 


            if (datatype == "int" or datatype == "float"):
                packetDatatype = "number"
                body = str.encode(str(data))
        else:
            body = data
            packetDatatype = "buffer"

        header = self.encodeHeader(channel, packetDatatype, [])
        packet = header + body

        return packet
    
    def encodeHeader(self, channel, datatype, custom):
        metaString = ""

        def addMetadata(str):
            nonlocal metaString

            if (len(metaString) > 0):
                metaString += "|"
            
            metaString += str

        def fixNrLength(nr):
            stringed = str(nr)

            while len(stringed) < 4:
                stringed = "0" + stringed
            
            return stringed

        addMetadata(channel)
        addMetadata(datatype)
    
        if custom is not None:
            for header in custom:
                addMetadata(header)
        
        metadata = str.encode(metaString)
        headerLength = fixNrLength(len(metadata) + len(self.signature) + 4)
        header = self.signature + str.encode(headerLength) + metadata

        return header
        
    def checkString(self, str):
        valid = True

        for res in self.reserved:
            if res in str:
                valid = False 
        
        return valid

    def decode(self, buffer):
        head = buffer[0:len(self.signature)]
        
        # if the package is not encoded as a udpluis package
        if head != self.signature:
            return "raw", buffer

        #get header length
        lenStr = buffer[len(self.signature):len(self.signature) + 4]
        headLength = int(lenStr)

        #extract header info, get metadata
        metadataBuffer = buffer[(len(self.signature) + 4):headLength]
        metadata = metadataBuffer.decode("utf-8").split("|")

        datatype = metadata[1]
        dataBuffer = buffer[headLength:len(buffer)]

        data = False
        
        # decode string
        if (datatype == "string"):
            data = dataBuffer.decode("utf-8")

        # decode json
        if (datatype == "object"):
            # string
            data = dataBuffer.decode("utf-8")

            # try to parse
            try:
                data = json.loads(data)
            except Exception as e:
                print("decoder: Failed to parse JSON")

        # decode number
        if (datatype == "number"):
            #very shit
            try:
                data = int(dataBuffer)
            except:
                data = float(dataBuffer)

        if (datatype == "buffer"):
            data = dataBuffer

        return metadata[0], data, metadata


    def heartbeat(self):
            # if there is an active connection, send a heartbeat
            while True:
                if (self.connected == True):
                    self.dispatch("keep-alive", str(time.time()))
                else:
                    break
                
                time.sleep(self.timeout / 2)


