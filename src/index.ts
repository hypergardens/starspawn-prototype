import utils = require("./utils");
import GameModule = require("./GameModule");
import PlayerModule = require("./PlayerModule");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
utils.newLine("Test");
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
    teaRoom: true,
    baseName: "tea room",
    area: true,
    dummy: { blorp: 5 },
});
game.addEntity(player, area);

let stove = game.addEntity(
    {
        baseName: "stove",
        active: false,
        surface: true,
        messageCounter: {
            messages: [
                "The stove's flame burns a warm orange.",
                "The stove's flame crackles",
            ],
            ctr: 0,
            ctrMax: 20,
        },
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
        solidContainer: {
            open: false,
        },
    },
    area
);

let cranberryTeabag = game.addEntity(
    {
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
        solidContainer: { open: false },
        item: true,
        locked: { password: `6` },
    },
    table,
    "on"
);

let smallerChest = game.addEntity(
    {
        baseName: "smaller chest",
        solidContainer: { open: false },
        item: true,
    },
    lockedChest,
    "in"
);

let evenSmallerChest = game.addEntity(
    {
        baseName: "even smaller chest",
        solidContainer: { open: false },
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
