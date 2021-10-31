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
    baseName: "room",
    area: true,
});
game.addEntity(player, area);

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
