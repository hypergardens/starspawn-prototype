function createWait(ticks) {
    return {
        duration: ticks,
        pause: 100,
    }
}

module.exports = { createWait }