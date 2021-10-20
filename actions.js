let timing = require("./timing");
// let utils = require("./utils");
// let newLine = utils.newLine;

function createWait(ticks) {
    return {
        duration: ticks,
        pause: timing.mpt / Math.pow(ticks, 0.9),
    }
}

module.exports = { createWait }