let utils = require("./utils");
// HACK
let newLine = utils.newLine;
let GameModule = require("./GameModule");
let game = new GameModule.Game();

let PlayerModule = require("./PlayerModule");
let player = new PlayerModule.Player(game);
game.player = player;

let UI = require("./UI").UI
let ui = new UI();

let teaRoomMod = require("./modTeaRoom");
teaRoomMod.loadMod(player, game);

// let debugMod = require("./modDebug");
// debugMod.loadMod(player, game);

////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////  Patterns   ////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

class Teapot {
    constructor() {
        this.baseName = "teapot";
        this.fluidContainer = true;
        this.item = true;
    }
}

// game.addEntity({ baseName: "rose", inv: false, weight: 1, smell: "sweet" })
// game.addEntity({ baseName: "rose", inv: true, weight: 2, smell: "sugary" })
// game.addEntity({ baseName: "daisy", inv: false, weight: 1, smell: "daisylike" })
// game.addEntity({ baseName: "shrine", shrine: true })
// game.addEntity({ baseName: "crystal", inv: false, weight: 1 })
// game.addEntity({ baseName: "boulder", weight: 10 })
let debug = false;
if (!debug) {

    let area = { baseName: "tea room" };
    game.addEntity(area);
    game.addEntity(player, area);
    game.addEntity({ baseName: "stove", active: false, surface: true, heatSource: true, ctr: 0 }, area);
    game.addEntity({ baseName: "faucet", fluidSource: "water", temperature: 20 }, area);
    game.addEntity({ baseName: "punching bag", health: 5 }, area);
    let cupboard = { baseName: "tea cupboard", closed: true };
    game.addEntity(cupboard, area);
    game.addEntity(new Teapot(), area);
    let cranberryTeabag = { baseName: `cranberry teabag`, item: true, flammable: true, infusable: true, flavour: "OBVIOUS" };
    // let cranberryTeabag = { baseName: `instant noodles`, item: true, flammable: true, infusable: true, flavour: "salty" };
    // game.addEntity(noodles, cupboard);
    game.addEntity(cranberryTeabag, cupboard);
    let table = { baseName: "table", surface: true }
    game.addEntity(table, area);
    game.addEntity({ baseName: "cup", fluidContainer: true, item: true }, table);
    game.addEntity({ baseName: "bowl", fluidContainer: true, item: true }, table);
    let note = { baseName: "super secret note", note: { content: `"The password is 6 1 5..."` } };
    game.addEntity(note, table);
    let stain = { baseName: "oily stain" };
    game.addEntity(stain, note);
    let chest = { baseName: "chest", closed: true, locked: true, lockedContainer: { password: `615` } };
    game.addEntity(chest, table);
    let smallerChest = { baseName: "smaller chest", closed: true };
    game.addEntity(smallerChest, chest);

    let evenSmallerChest = { baseName: "even smaller chest", closed: true };
    game.addEntity(evenSmallerChest, smallerChest);
    game.addEntity({ baseName: `SECRETIVE teabag`, item: true, flammable: true, infusable: true, flavour: "SECRET" }, evenSmallerChest);

} else {
    let area = { baseName: "tea room" };
    game.addEntity(area);
    game.addEntity(player, area);
    game.addEntity({ baseName: "stove", active: true, surface: true, heatSource: true, ctr: 0 }, area);
    game.addEntity({ baseName: "faucet", fluidSource: "water", temperature: 20 }, area);
    game.addEntity({ baseName: "punching bag", health: 5 }, area);
    let cupboard = { baseName: "tea cupboard", closed: true };
    game.addEntity(cupboard, area);
    let teapot = new Teapot();
    game.addEntity(teapot, area);
    let cranberryTeabag = { baseName: `cranberry teabag`, item: true, flammable: true, infusable: true, flavour: "OBVIOUS" };
    // let cranberryTeabag = { baseName: `instant noodles`, item: true, flammable: true, infusable: true, flavour: "salty" };
    // game.addEntity(noodles, cupboard);
    game.addEntity(cranberryTeabag, teapot);
    let table = { baseName: "table", surface: true }
    game.addEntity(table, area);
    game.addEntity({ baseName: "cup", fluidContainer: true, item: true }, table);
    game.addEntity({ baseName: "bowl", fluidContainer: true, item: true }, table);
    let note = { baseName: "super secret note", note: { content: `"The password is 6 1 5..."` } };
    game.addEntity(note, table);
    let stain = { baseName: "oily stain" };
    game.addEntity(stain, note);
    let chest = { baseName: "chest", closed: true, locked: true, lockedContainer: { password: `615` } };
    game.addEntity(chest, table);
    let smallerChest = { baseName: "smaller chest", closed: true };
    game.addEntity(smallerChest, chest);

    let evenSmallerChest = { baseName: "even smaller chest", closed: true };
    game.addEntity(evenSmallerChest, smallerChest);
    game.addEntity({ baseName: `SECRETIVE teabag`, item: true, flammable: true, infusable: true, flavour: "SECRET" }, teapot);
}



// keyboard mode
let keys = "abcdefghijklmnopqrstuwxyz".split("");
document.addEventListener('keypress', (event) => {
    var name = event.key;
    if (player.picking && keys.indexOf(name) !== -1) {
        // alert(`pressed ${keys.indexOf(name)} of ${keys}`)
        player.pickNextWord(keys.indexOf(name));
        player.setOptionsUI();
    }
}, false);

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