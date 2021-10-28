import GameModule = require("./GameModule");
import PlayerModule = require("./PlayerModule");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
let game = new GameModule.Game();
let player = new PlayerModule.Player();
game.player = player;

// load mods
let teaRoomMod = require("./modTeaRoom");
teaRoomMod.loadMod(player, game);

// let debugMod = require("./modDebug");
// debugMod.loadMod(player, game);

let debug = false;
let area = game.addEntity({
    baseName: "tea room",
    area: true,
});
game.addEntity(player, area);

let stove = game.addEntity(
    {
        baseName: "stove",
        active: false,
        surface: true,
    },
    area
);

let faucet = game.addEntity(
    {
        baseName: "faucet",
        fluidSource: "water",
    },
    area
);

let punchingBag = game.addEntity(
    {
        baseName: "punching bag",
        health: 5,
    },
    area
);

let teaCupboard = game.addEntity(
    {
        baseName: "tea cupboard",
        solidContainer: true,
        closed: true,
    },
    area
);

let cranberryTeabag = game.addEntity(
    {
        baseName: "cranberry teabag",
        item: true,
        infusable: {
            flavour: "OBVIOUS",
        },
    },
    teaCupboard
);

let table = game.addEntity(
    {
        baseName: "table",
        surface: true,
    },
    area
);

let knife = game.addEntity(
    {
        baseName: "knife",
        item: true,
    },
    table,
    "on"
);

let cup = game.addEntity(
    {
        baseName: "cup",
        item: true,
        fluidContainer: true,
    },
    table,
    "on"
);

let bowl = game.addEntity(
    {
        baseName: "bowl",
        item: true,
        fluidContainer: true,
    },
    table,
    "on"
);

let note = game.addEntity(
    {
        baseName: "super secret note",
        item: true,
        readable: {
            message: `The note says: "The password is 6...`,
        },
    },
    table,
    "on"
);

let lockedChest = game.addEntity(
    {
        baseName: "locked chest",
        solidContainer: true,
        closed: true,
        item: true,
        locked: { isLocked: true, password: `6` },
    },
    table,
    "on"
);

let smallerChest = game.addEntity(
    {
        baseName: "smaller chest",
        solidContainer: true,
        closed: true,
        item: true,
    },
    lockedChest,
    "in"
);

let evenSmallerChest = game.addEntity(
    {
        baseName: "even smaller chest",
        solidContainer: true,
        closed: true,
        item: true,
    },
    smallerChest,
    "in"
);

let secretTeabag = game.addEntity(
    {
        baseName: "secretive teabag",
        item: true,
        infusable: { flavour: "SECRET" },
    },
    smallerChest,
    "in"
);

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
