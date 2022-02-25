from functools import wraps
from collections import defaultdict

def chain_method(func):
    @wraps(func)
    def inner(self, *args, **kwargs):
        func(self, *args, **kwargs)
        return self

    return inner

class EventEmitter(object):

    def __init__(self):
        self.event_handlers = defaultdict(lambda : [])

    @chain_method
    def on(self, event_name, handler):
        self.event_handlers[event_name].append(handler)

    def emit(self, event_name, *args, **kwargs):
        for handler in self.event_handlers[event_name]:
            handler(*args, **kwargs)