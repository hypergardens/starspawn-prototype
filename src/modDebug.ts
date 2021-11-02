import timing = require("./timing");
import { Game } from "./GameModule";
import { Player } from "./PlayerModule";
export function loadMod(game: Game) {
    let player = game.entities.filter((e) => e.player)[0] as Player;

    game.actions.wait = function (ticks) {
        // game.newLine(`Still waiting... of ${ticks}`);
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

    game.actions.traverse = function (actorId, pathId) {
        let path = game.getById(pathId);
        let origin = game.getById(path.path.from);
        let destination = game.getById(path.path.to);
        let actor = game.getById(actorId);
        if (actor.player) {
            game.newLine(`You go to ${destination.baseName}`);
        }
        game.queueEvent({
            type: "traverse",
        });
        actor.parent = destination.id;
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let path of game.entities.filter(
                (e) => e.path && e.path.from === player.parent
            )) {
                intents.push({
                    representation: [
                        game.word("go:"),
                        game.getById(path.path.to),
                    ],
                    sequence: [
                        createWaitAction(path.path.distance),
                        { func: "traverse", args: [player.id, path.id] },
                    ],
                });
            }
            return intents;
        },
    });
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
            events: [{ type: "ping" }],
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

    game.addHandler(0, {
        on_ping: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Pong!"],
                events: [{ type: "pong" }],
                pause: 300,
            });
        },
    });

    game.addHandler(0, {
        on_pong: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Peng!"],
                events: [{ type: "peng" }],
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
                        events: [{ type: "ping" }],
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
    game.addHandler(0, {
        on_tick: function (data) {
            for (let timer of game.entities.filter((e) => e.timer)) {
                timer.timer.time += 1;
            }
        },
    });
}

module.exports = { loadMod };
