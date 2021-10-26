import utils = require("./utils");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
utils.newLine("Test");
import GameModule = require("./GameModule");
let game = new GameModule.Game();

import PlayerModule = require("./PlayerModule");
let player = new PlayerModule.Player();
game.player = player;

// load mods
let teaRoomMod = require("./modTeaRoom");
teaRoomMod.loadMod(player, game);

let debugMod = require("./modDebug");
debugMod.loadMod(player, game);

let debug = false;
let area = game.addEntity({
    teaRoom: true,
    baseName: "tea room",
    area: true,
    dummy: { blorp: 5 },
});

let stove = game.addEntity(
    {
        baseName: "stove",
        active: false,
        surface: true,
    },
    area
);

game.addEntity(player, area);
// let area = game.buildObject({ teaRoom: true, baseName: "tea room" }, [
//     ["comp", { area: true }],
//     ["comp", { dummy: true, blorp: 5 }],
//     ["contains", player],
//     // stove
//     [
//         "contains",
//         game.buildObject({ stove: true, baseName: "stove" }, [
//             ["comp", { active: false }],
//             ["comp", { surface: true }],
//             [
//                 "comp",
//                 {
//                     messageCounter: true,
//                     ctr: 0,
//                     ctrMax: 20,
//                     message: "The stove burns hot.",
//                 },
//             ],
//             ["comp", { heatSource: true }],
//         ]),
//     ],
//     // faucet
//     [
//         "contains",
//         game.buildObject({ faucet: true, baseName: "faucet" }, [
//             ["comp", { fluidSource: "water" }],
//         ]),
//     ],
//     // punching bag
//     [
//         "contains",
//         game.buildObject({ baseName: "punching bag" }, [
//             ["comp", { enemy: true }],
//             ["comp", { health: 5 }],
//         ]),
//     ],
//     // tea cupboard
//     [
//         "contains",
//         game.buildObject({ baseName: "tea cupboard" }, [
//             ["comp", { solidContainer: true, open: false }],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "cranberry teabag" }, [
//                     ["comp", { item: true }],
//                     ["comp", { infusable: true, flavour: "OBVIOUS" }],
//                 ]),
//             ],
//         ]),
//     ],
//     [
//         "contains",
//         game.buildObject({ baseName: "table" }, [
//             ["comp", { surface: true }],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "knife" }, [
//                     ["comp", { item: true }],
//                 ]),
//             ],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "cup" }, [
//                     ["comp", { item: true }],
//                     ["comp", { fluidContainer: true }],
//                 ]),
//             ],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "bowl" }, [
//                     ["comp", { item: true }],
//                     ["comp", { fluidContainer: true }],
//                 ]),
//             ],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "super secret note" }, [
//                     ["comp", { item: true }],
//                     [
//                         "comp",
//                         { readable: true, message: "The password is 6..." },
//                     ],
//                 ]),
//             ],
//             [
//                 "contains",
//                 game.buildObject({ baseName: "locked chest" }, [
//                     ["comp", { solidContainer: true, open: false }],
//                     ["comp", { locked: true, password: `6` }],
//                     ["comp", { item: true }],
//                     [
//                         "contains",
//                         game.buildObject({ baseName: "smaller chest" }, [
//                             ["comp", { solidContainer: true, open: false }],
//                             ["comp", { item: true }],
//                             [
//                                 "contains",
//                                 game.buildObject(
//                                     { baseName: "even smaller chest" },
//                                     [
//                                         [
//                                             "comp",
//                                             {
//                                                 solidContainer: true,
//                                                 open: false,
//                                             },
//                                         ],
//                                         ["comp", { item: true }],
//                                         [
//                                             "contains",
//                                             game.buildObject(
//                                                 {
//                                                     baseName:
//                                                         "secretive teabag",
//                                                 },
//                                                 [
//                                                     ["comp", { item: true }],
//                                                     [
//                                                         "comp",
//                                                         {
//                                                             infusable: true,
//                                                             flavour: "SECRET",
//                                                         },
//                                                     ],
//                                                 ]
//                                             ),
//                                         ],
//                                     ]
//                                 ),
//                             ],
//                         ]),
//                     ],
//                 ]),
//             ],
//         ]),
//     ],
// ]);

console.log(game.entities);

console.log("comps of area");
let keys = "abcdefghijklmnopqrstuwxyz".split("");
document.addEventListener(
    "keypress",
    (event) => {
        var name = event.key;
        if (name === "`") {
            game.playRandomly = !game.playRandomly;
        }
        if (player.picking && keys.indexOf(name) !== -1) {
            // alert(`pressed ${keys.indexOf(name)} of ${keys}`)
            player.pickNextWord(keys.indexOf(name));
            player.setOptionsUI();
        }
    },
    false
);

player.updateCommandUI();
game.updateEntityTreeUI();
game.getIntents();

console.log({ "all intents": player.getAllIntents() });
// for (let intent of player.getAllIntents()) {
//     console.log({ intent })
// }

function debugText(text) {
    document.getElementById("debug").innerText = text;
}
