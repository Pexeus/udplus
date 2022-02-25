from events import EventEmitter
import time


class ReadFileStream(EventEmitter):

    def __init__(self, file_name):
        super(ReadFileStream, self).__init__()

        self.file_name = file_name

    def execute(self):
        while True:
            self.emit('data', "OBUNGUS")
            time.sleep(1)