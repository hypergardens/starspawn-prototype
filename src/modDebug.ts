import timing = require("./timing");

function loadMod(player, game) {
    game.actions.wait = function (ticks) {
        game.newLine(`Still waiting... of ${ticks}`);
    };

    function createNewLineAction(text) {
        return {
            func: "newLine",
            args: [text],
        };
    }

    function createWaitAction(ticks) {
        return {
            func: "wait",
            args: [ticks],
            duration: ticks,
            // 1 -> 1, 10 -> 2
            pause: timing.mpt / Math.pow(ticks, 1),
        };
    }

    // // wait various durations
    // player.patterns.push({
    //     intents: () => {
    //         let intents = [];
    //         let durations = [
    //             { baseName: "1 tick", dur: 1 },
    //             { baseName: "3 ticks", dur: 3 },
    //             { baseName: "6 ticks", dur: 6 },
    //             // { baseName: "12 ticks", dur: 12 },
    //             { baseName: "1 minute", dur: timing.m(1) },
    //             { baseName: "1 hour", dur: timing.h(1) },
    //             { baseName: "1 day", dur: timing.h(24) },
    //         ];
    //         for (let duration of durations) {
    //             let intent = {
    //                 representation: [
    //                     game.word("wait"),
    //                     game.word(duration.baseName),
    //                 ],
    //                 sequence: [
    //                     createNewLineAction(`You wait ${duration.dur} ticks.`),
    //                     createWaitAction(duration.dur),
    //                 ],
    //             };
    //             intents.push(intent);
    //         }
    //         return intents;
    //     },
    // });

    // random clapping
    player.addPattern({
        intents: function () {
            let intents = [];
            // the effect function
            function effect() {
                game.newLine("CLAP!");
            }
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("slow clap.")],
                sequence: [
                    createWaitAction(4),
                    createNewLineAction("CLAP!"),
                    createWaitAction(2),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                    createWaitAction(2),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                ],
            });
            return intents;
        },
    });

    function createPingAction() {
        return {
            func: "newLine",
            args: ["ping"],
            pause: 100,
            signals: [{ type: "ping" }],
            duration: 0,
        };
    }

    // 3x ping, to be responded to with pong and peng
    player.addPattern({
        intents: function () {
            let intents = [];
            intents.push({
                representation: [game.word("DEBUG"), game.word("3 x ping.")],
                sequence: [
                    createPingAction(),
                    createPingAction(),
                    createPingAction(),
                ],
            });
            return intents;
        },
    });

    game.receivers.push({
        on_ping: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Pong!"],
                signals: [{ type: "pong" }],
                pause: 300,
            });
        },
    });

    game.receivers.push({
        on_pong: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Peng!"],
                signals: [{ type: "peng" }],
                pause: 300,
            });
        },
    });

    // plain longer action
    player.addPattern({
        intents: function () {
            let intents = [];
            // the sequence
            intents.push({
                representation: [
                    game.word("DEBUG"),
                    game.word("POW"),
                    game.word("POW"),
                    game.word("POW"),
                ],
                sequence: [createNewLineAction("POW POW POW!")],
            });
            return intents;
        },
    });

    // plain shorter action
    player.addPattern({
        intents: function () {
            let intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("POW")],
                sequence: [createNewLineAction("POW!")],
            });
            return intents;
        },
    });

    // duration 2 action that releases pings
    player.addPattern({
        intents: function () {
            let intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("long-ping")],
                sequence: [
                    {
                        func: "newLine",
                        args: ["piiiiiiiiing!"],
                        pause: 300,
                        signals: [{ type: "ping" }],
                        duration: 2,
                    },
                ],
            });
            return intents;
        },
    });

    // 3 ticks
    player.addPattern({
        intents: function () {
            let intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("wait 3 ticks")],
                sequence: [createWaitAction(3)],
            });
            return intents;
        },
    });

    // tick timers up
    game.receivers.push({
        on_tick: function (data) {
            for (let timer of game.entities.filter((e) => e.type === "timer")) {
                timer.time += 1;
            }
        },
    });
}

module.exports = { loadMod };
