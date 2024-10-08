const MESSAGE = Object.freeze({
    server: "API SERVER",
    queue: "QUEUE",
    socket: "SOCKETS",

})

const socketLog = (...args) => {
    console.info(MESSAGE.socket, args)
}

const socketError = (...args) => {
    console.error(MESSAGE.socket, args)
}

const serverLog = (...args) => {
    console.info(MESSAGE.server, args)
}

const serverError = (...args) => {
    console.error(MESSAGE.server, args)
}

const queueLog = (...args) => {
    console.info(MESSAGE.queue, args)
}

const queueError = (...args) => {
    console.error(MESSAGE.queue, args)
}

module.exports = {
    socketLog,
    socketError,
    queueLog,
    queueError,
    serverLog,
    serverError
}