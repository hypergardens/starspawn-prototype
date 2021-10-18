let timing = require("./timing");

function createWait(ticks) {
    return {
        duration: ticks,
        pause: timing.mpt / Math.pow(ticks, 0.9),
    }
}

module.exports = { createWait }