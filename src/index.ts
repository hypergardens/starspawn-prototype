import GameModule = require("./GameModule");
import PlayerModule = require("./PlayerModule");
import teaRoomMod = require("./modTeaRoom");
import debugMod = require("./modDebug");
import fightingMod = require("./modFighting");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
let game = new GameModule.Game();
let player = new PlayerModule.Player();
game.player = player;

// load mods

let debug = false;
let areaA = game.addEntity({
    name: "room A",
    area: true,
});
let areaB = game.addEntity({
    name: "room B",
    area: true,
});

let areaC = game.addEntity({
    name: "room C",
    area: true,
});

game.addEntity({
    path: {
        from: areaA.id,
        to: areaB.id,
        distance: 10,
    },
});
game.addEntity({
    path: {
        from: areaB.id,
        to: areaC.id,
        distance: 20,
    },
});
game.addEntity({
    path: {
        from: areaC.id,
        to: areaB.id,
        distance: 4,
    },
});

game.addEntity(player, areaA);
game.addEntity(
    { quality: { name: "Health", value: 10, pyramid: false } },
    player,
    "quality"
);
// teaRoomMod.loadMod(game);
debugMod.loadMod(game);
fightingMod.loadMod(game);

console.log(game.entities);

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
game.getPlayerIntent();

console.log({ "all intents": player.getAllIntents() });
// for (let intent of player.getAllIntents()) {
//     console.log({ intent })
// }

function debugText(text) {
    document.getElementById("debug").innerText = text;
}
