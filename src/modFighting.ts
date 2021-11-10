import * as timing from "./timing";
import * as GameModule from "./GameModule";

import { Entity, Action } from "./Interfaces";
import { Player } from "./PlayerModule";

function makeDevil(): Entity {
    return { name: "devil", actor: { intent: null } };
}

export function loadMod(game: GameModule.Game) {
    let player = game.entities.filter((e) => e.player)[0] as Player;
    let area = game.entities.filter((e) => e.area)[0];

    game.actions.newLine = (...args) => game.newLine.call(game, ...args);
    console.log("loading mod fight");

    let devil = game.addEntity(makeDevil(), area);
    game.addEntity(
        { quality: { name: "health", value: 10, pyramid: false } },
        devil,
        "quality"
    );

    // devils with no intent will do a 6-tick dance
    game.addHandler(0, {
        on_getIntents: () => {
            for (let devil of game
                .intentless()
                .filter((d) => d.name === "devil")) {
                console.log(`setting intent for devil`);
                if (Math.random() < 0.5) {
                    // strike
                    devil.actor.intent = {
                        sequence: [
                            {
                                duration: 4,
                                processText:
                                    "The devil is preparing to strike...",
                            },
                            {
                                func: "newLine",
                                args: ["The devil strikes you!"],
                            },
                        ],
                    };
                } else {
                    // dodge
                    devil.actor.intent = {
                        sequence: [
                            {
                                func: "newLine",
                                args: ["The devil dodges."],
                            },
                            {
                                duration: 6,
                                processText: "The devil is dodging...",
                            },
                        ],
                    };
                }
            }
        },
    });
}
