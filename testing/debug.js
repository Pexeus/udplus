const EventEmitter = require('events');
const e = new EventEmitter();

e.dispatch = e.emit

e.emit = () => {
    console.log("ja");
}

e.on("test", data => {
    console.log(data);
})

e.emit()

e.dispatch("test", "schwanz")