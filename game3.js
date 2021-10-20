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
let area = { baseName: "tea room" };
game.addEntity(area);
game.addEntity(player, area);
game.addEntity({ baseName: "stove", active: false, surface: true, heatSource: true, ctr: 0 }, area);
game.addEntity({ baseName: "faucet", fluidSource: true, fluid: "water", temperature: 20 }, area);
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


game.receivers.push({
    on_damageDealt: function(data) {
        newLine(`Damage dealt by ${data.by.baseName}`);
        if (data.to.health <= 0 && !data.to.dead) {
            data.to.dead = true;
            newLine(`You have defeated your first enemy, a vile ${data.to.baseName}. It drops a teabag!`);
            data.to.baseName = `dead ${data.to.baseName}`;
            data.health = undefined;
            game.addEntity({ baseName: `VICTORIOUS teabag`, item: true, flammable: true, infusable: true, flavour: "VICTORY" }, data.to.parent);
        }
    }
})

game.receivers.push({
    on_tick: function(data) {
        for (let stove of game.entities.filter(e => e.baseName === "stove")) {
            if (stove.active) {
                stove.ctr += 1;
                if (stove.ctr >= 10) {
                    stove.ctr = 0;
                    newLine("The stove's flame burns a warm orange.")
                }
                for (let entityOnStove of game.entities.filter(e => (e.parent === stove.id))) {
                    // newLine(`The stove heats up the ${entityOnStove.baseName}`)
                    if (entityOnStove.fluidContainer) {
                        for (let fluid of game.entities.filter(e => (e.fluid && game.isParent(entityOnStove, e)))) {
                            // newLine(`The stove heats up the ${fluid.baseName} in the ${entityOnStove.baseName}`);
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                newLine(`The ${entityOnStove.baseName} is filled with hot ${fluid.baseName}!`)
                            }
                        }
                    }
                    if (entityOnStove.flammable) {
                        // newLine(`The ${entityOnStove.baseName} burns up`)
                        // game.deleteById(entityOnStove.id);
                    }
                }
            }
        }
    }
});

game.receivers.push({
    on_tick: function(data) {
        for (let fluidContainer of game.entities.filter(e => e.fluidContainer)) {
            for (let hotFluid of game.entities.filter(hotFluid => (
                    hotFluid.fluid &&
                    game.isParent(fluidContainer, hotFluid) &&
                    hotFluid.temperature > 23))) {
                let count = 0;
                let prefix = "";
                // if infusable in container and hot fluid
                for (infusingTeabag of game.entities.filter(e => (
                        e.infusable &&
                        game.isParent(fluidContainer, e)))) {
                    count += 1;
                    prefix += `${infusingTeabag.flavour} `
                    game.emitSignal({ type: "teaMade" });
                    if (count < 3) {
                        hotFluid.baseName = `${prefix} tea`;
                    } else {
                        hotFluid.baseName = `TURBO TESTER TEA`;
                        newLine("TOTAL VICTORY ACHIEVED! Thanks for playing!");
                    }
                    console.log("hotFluid", hotFluid);
                }
            }
        }
    }
})

game.addEntity({
    type: "winBehaviourState",
    baseName: "winBehaviourState",
    won: false,
    invisible: true,
    uberWon: false
});

game.receivers.push({
    on_teaMade: function(data) {
        let state = game.entities.filter(e => e.type === "winBehaviourState")[0];
        if (state.won === false) {
            newLine(`Congratulations, you have made tea! Did you find all three teabags? I wonder what happens if you infuse them all at once...`)
            state.won = true;
        }
    }
})


game.addEntity({
    baseName: "timer",
    type: "timer",

    invisible: true,
    time: -1
})



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

function debug(text) {
    document.getElementById("debug").innerText = text;
}