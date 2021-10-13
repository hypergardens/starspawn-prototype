(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class Core {
    constructor() {
        this.id = 0;
        this.entities = [];
    }

    addEntity(entity, parentEntity = undefined) {
        this.entities.push(entity);
        entity.id = this.id++;
        entity.parent = (parentEntity === undefined) ? undefined : parentEntity.id;
    }

    getById(id) {
        let found = undefined;
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].id === id) {
                found = this.entities[i];
            }
        }
        if (found === undefined) throw `object not found with id ${id}`;
        return found;
    }

    getDepth(entity) {
        if (entity.id === undefined) throw `no id for object ${entity}`;
        let depth = 0;
        while (entity.parent !== undefined) {
            entity = this.getById(entity.parent);
            depth += 1;
        }
        return depth;
    }

    childrenOf(entity) {
        let contents = this.entities.filter(e => isParent(entity, e));
        // if (contents.length > 0) console.log(contents)
        // console.log("children of", entity.baseName, contents)
        return contents;
    }

    deleteById(id) {
        // TODO? throw if not found
        this.entities = this.entities.filter(e => e.id !== id);
    }

    isAccessible(entity) {
        if (entity === undefined || entity.parent === undefined) return true;
        let parent = this.getById(entity.parent);
        let accessible = !parent.closed && !parent.locked;
        return accessible && this.isAccessible(parent);
    }
}

class Word {
    constructor(baseName) {
        this.baseName = baseName;
        this.type = "word";
    }
}

class Words {
    constructor() {
        this.words = {}
    }
    get(text) {
        if (!this.words[text]) {
            let word = new Word(text);
            this.words[text] = word;
        }
        return this.words[text];
    }
}

let words = new Words();
let receivers = [];

function isParent(parentEntity, child) {
    return child.parent === parentEntity.id;
}

function setParent(parentEntity, child) {
    child.parent = parentEntity.id;
}

function unsetParent(child) {
    child.parent = undefined;
}
////////////////// Main
////////////////// Player

class Player {
    constructor(core) {
        this.baseName = "starspawn";
        this.core = core;
        this.intent = undefined; // action
        this.windup = 0;
        this.winddown = 0;
        this.picking = false;
        this.command = [];
        this.patterns = [];
    }

    addPattern(pattern) {
        this.patterns.push(pattern);
    }

    getAllActions() {
        let actions = []
        for (let pattern of this.patterns) {
            for (let action of pattern.actions()) {
                actions.push(action);
            }
        }
        return actions;
    }

    //^ getAllActions(), command
    getValidActions() {
        let validActions = [];
        for (let action of this.getAllActions()) {
            let valid = true;
            for (let i = 0; i < this.command.length; i++) {
                if (action.representation[i] !== this.command[i]) {
                    // console.log(action.representation[i].baseName, "invalid")
                    valid = false;
                } else {
                    // console.log(action.representation[i].baseName, "valid")
                }
            }
            if (valid) {
                validActions.push(action);
            }
        }
        return validActions;
    }



    //^ getValidActions(), command
    // get options for next word to pick
    getNextWords() {
        let options = [];
        let validActions = this.getValidActions();

        console.log(`${validActions.length} valid commands at command.length ${player.command.length}`)
        for (let action of validActions) {
            // console.log(`studying ${action.representation.map(e => e.baseName)}`);
            // console.log(action);
            // if the action is the same length as the command, it can be setIntentd
            if (action.representation.length == player.command.length) {
                options.push({ baseName: "setIntent" })
            } else {
                let newOption = action.representation[player.command.length];
                let duplicateThing = false;

                for (let option of options) {
                    if (newOption === option) {
                        duplicateThing = true;
                    }
                }

                if (!duplicateThing) {
                    options.push(newOption);
                }
            }
        }
        console.log("options:", options)
        return options;
    }


    // updateCommandUI()
    pickNextWord(optionI) {
        let options = this.getNextWords();
        // console.log(`picked ${options[optionI].baseName}`);
        this.command.push(options[optionI]);

        updateCommandUI(this);
    }


    // getValidActions(), player, clearCommand()
    // set intent and clear the command
    setIntent() {
        // get valid actions
        let actions = this.getValidActions();
        if (actions.length !== 1) {
            throw "EXECUTION ERROR, NOT ONE VALID ACTION"
        }
        let action = actions[0];
        console.log(`intending ${action.representation.map(e => e.baseName)}`);

        // set intent, not picking
        this.intent = action;
        this.picking = false;

        // clear command
        this.command = [];
        updateCommandUI(this);

        emitSignal("playerTick", {});
    }

    isBusy() {
        return !(this.intent === undefined || this.intent.queue.length === 0);
    }
}

let core = new Core()
let player = new Player(core)


//^ command, document
function updateCommandUI(player) {
    document.getElementById("command").innerHTML = ">" + player.command.map(e => e.baseName).join(" ");
}


// document
function clearOptionsUI() {
    document.getElementById('options').innerHTML = "";
}

// document
// NextWord* -> HTML elements with events
function setOptions(player) {
    document.getElementById('options').innerHTML = "";

    // coupling with player, no options of windup or down
    if (player.windup > 0 || player.winddown > 0) return;

    // get the next words, and create an element for each on document
    let options = player.getNextWords();
    for (let i = 0; i < options.length; i++) {
        let optionText = options[i].baseName;
        // create a span with the optionText baseName
        var node = document.createElement("a");
        node.className = "choice";
        node.innerText = optionText;
        document.getElementById('options').appendChild(node);
        // when the span is clicked, handle using that optionText
        if (optionText === "setIntent") {
            node.addEventListener("click", () => {
                player.setIntent();
                clearOptionsUI();
            });
        } else {
            node.addEventListener("click", () => {
                player.pickNextWord(i);
                setOptions(player);
            });
        }
    }

    // create a cancel node if there's a command
    if (player.command.length > 0) {
        let cancelNode = document.createElement("a");
        cancelNode.className = "cancel";
        cancelNode.innerText = "cancel";
        document.getElementById('options').appendChild(cancelNode);
        cancelNode.addEventListener("click", () => {
            player.command = [];
            setOptions(player);
            updateCommandUI(player);
        });
    }
}


player.addPattern({
    // fill container from fluidSource
    actions: function() {
        let actions = [];
        for (let fluidSource of core.entities.filter(e => e.fluidSource)) {
            for (let container of core.entities.filter(e => e.fluidContainer)) {
                // check the container is empty, no fluids in container
                let fluidsInContainer = core.entities.filter(e => e.fluid && isParent(container, e));
                // console.log("fluids", fluidsInContainer);
                if (fluidsInContainer.length === 0) {
                    function effect() {
                        let fluid = { baseName: fluidSource.fluid, fluid: true, temperature: fluidSource.temperature }
                        newLine(`You fill up the ${container.baseName} from the ${fluidSource.baseName} with ${fluid.baseName}`)
                        core.addEntity(fluid);
                        setParent(container, fluid);
                    }
                    actions.push({
                        representation: [words.get("fill"), container, words.get("from"), fluidSource],
                        queue: [2, effect, 3],
                        // condition: function() {
                        //     return core.getById(fluidSource.id) && core.getById(container.id);
                        // },
                    });
                }
                // throw "HALT"
            }
        }
        return actions;
    }
});

player.addPattern({
    // empty container
    actions: function() {
        let actions = [];
        for (let container of core.entities.filter(e => e.fluidContainer)) {
            if (core.childrenOf(container).length !== 0) {
                function effect() {
                    newLine(`You empty the ${container.baseName}.`);
                    for (let entity of core.entities) {
                        if (isParent(container, entity)) {
                            console.log("deleting", entity);
                            console.log("all entities")
                            console.log(core.entities);
                            core.deleteById(entity.id);
                        }
                    }
                }
                actions.push({
                    representation: [words.get("empty"), container],
                    queue: [1, effect, 1],
                });
            }
        }
        return actions;
    }
});

player.addPattern({
    // pour X into Y
    actions: function() {
        let actions = [];
        let nonemptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length !== 0)))
        let emptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length === 0)))
        for (let sourceContainer of core.entities.filter(nonemptyContainer)) {
            for (let destinationContainer of core.entities.filter(emptyContainer)) {
                function effect() {
                    for (let entity of core.entities) {
                        if (isParent(sourceContainer, entity)) {
                            newLine(`You pour the ${entity.baseName} from the ${sourceContainer.baseName} into the ${destinationContainer.baseName}.`);
                            setParent(destinationContainer, entity);
                        }
                    }
                }
                actions.push({
                    representation: [words.get("pour"), sourceContainer, words.get("into"), destinationContainer],
                    queue: [1, effect, 1]
                });
            }
        }
        return actions;
    }
});

player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.item && core.isAccessible(e))) {
            for (let surface of core.entities.filter(e => e.surface)) {
                function effect() {
                    newLine(`You put the ${entity.baseName} on the ${surface.baseName}`);
                    entity.parent = surface.id;
                    console.log(entity);
                }
                actions.push({
                    representation: [words.get("put"), entity, words.get("on"), surface],
                    queue: [1, effect],
                });
            }
        }
        return actions;
    }
});


player.addPattern({
    actions: function() {
        let actions = [];
        for (let infusable of core.entities.filter(e => e.infusable && core.isAccessible(e))) {
            for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
                function effect() {
                    newLine(`You put the ${infusable.baseName} in the ${fluidContainer.baseName} for infusing`);
                    setParent(fluidContainer, infusable);
                }
                actions.push({
                    representation: [words.get("put"), infusable, words.get("in"), fluidContainer],
                    queue: [1, effect, 1]
                });
            }
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.active !== undefined && e.active === false)) {
            function effect() {
                entity.active = true;
                newLine(`You turn on the ${entity.baseName}`)
            }
            actions.push({
                representation: [words.get("turn on"), entity],
                queue: [effect]
            });
        }
        return actions;
    }
});

player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.active !== undefined && e.active === true)) {
            function effect() {
                entity.active = false;
                newLine(`You turn off the ${entity.baseName}`)
            }
            actions.push({
                representation: [words.get("turn off"), entity],
                queue: [effect],
            });
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    durations: [{ baseName: "a bit", dur: 1 }, { baseName: "a while", dur: 5 }, { baseName: "a long time", dur: 10 }],
    actions: function() {
        let actions = [];
        for (let duration of this.durations) {
            function effect() {
                newLine(`You wait ${duration.baseName}`)
            }
            actions.push({
                representation: [words.get("wait"), words.get(duration.baseName)],
                queue: [effect, duration.dur]
            });
        }
        return actions;
    }
});


player.addPattern({
    actions: function() {
        let actions = [];
        let flavours = ["mint", "chamomile", "cranberry"];
        for (let flavour of flavours) {
            let teabag = { baseName: `${flavour} teabag`, item: true, flammable: true, infusable: true, flavour: flavour };

            function effect() {
                core.addEntity(teabag);
                newLine(`You grab a ${flavour} teabag`);
            }
            actions.push({
                representation: [words.get("take"), words.get(`${flavour} teabag`)],
                queue: [2, effect]
            });
        }
        return actions;
    }
});

// player.addPattern({
//     actions: function() {
//         let actions = [];
//         // TODO: if there is tea, drink the tea
//         actions.push({
//             representation: [words.get("Enjoy the lovely cup of tea")],
//             windup: 3,
//             winddown: 3,
//             condition: function() {},
//             effect: function() {
//                 newLine("You sip the cup of tea peacefully.")
//             }
//         });
//         return actions;
//     }
// })


class Area {
    constructor() {
        this.baseName = "prototype area";
    }
}

class Teapot {
    constructor() {
        this.baseName = "teapot";
        this.fluidContainer = true;
        this.item = true;
    }
}

class Knife {
    constructor() {
        this.baseName = "knife";
        this.sharp = 3;
        this.item = true;
    }
}

class EventQueue {
    constructor() {

    }
}
// core.addEntity({ baseName: "rose", inv: false, weight: 1, smell: "sweet" })
// core.addEntity({ baseName: "rose", inv: true, weight: 2, smell: "sugary" })
// core.addEntity({ baseName: "daisy", inv: false, weight: 1, smell: "daisylike" })
// core.addEntity({ baseName: "shrine", shrine: true })
// core.addEntity({ baseName: "crystal", inv: false, weight: 1 })
// core.addEntity({ baseName: "boulder", weight: 10 })
let area = new Area()
core.addEntity(area);
let table = { baseName: "table", surface: true }
core.addEntity(table, area);
core.addEntity({ baseName: "faucet", fluidSource: true, fluid: "water", temperature: 20 }, area);
core.addEntity(new Teapot(), area);
core.addEntity({ baseName: "cup", fluidContainer: true, item: true }, table);
core.addEntity({ baseName: "stove", active: false, surface: true, heatSource: true, ctr: 0 }, area);
core.addEntity(new Knife, area);
let chest = { baseName: "chest", closed: true, locked: true, lockedContainer: { password: `615` } };
core.addEntity(chest, table);
let smallerChest = { baseName: "smaller chest", closed: true };
core.addEntity(smallerChest, chest);

core.addEntity({ baseName: `MAGICAL teabag`, item: true, flammable: true, infusable: true, flavour: "MAGICAL" }, smallerChest);
core.addEntity({ baseName: `FABULOUS teabag`, item: true, flammable: true, infusable: true, flavour: "FABULOUS" }, smallerChest);


receivers.push({
    on_tick: function(data) {
        for (let stove of core.entities.filter(e => e.baseName === "stove")) {
            if (stove.active) {
                if (stove.ctr >= 10) {
                    stove.ctr = 0;
                    newLine("The stove's flame burns a warm orange.")
                }
                for (let entityOnStove of core.entities.filter(e => (e.parent === stove.id))) {
                    // newLine(`The stove heats up the ${entityOnStove.baseName}`)
                    if (entityOnStove.fluidContainer) {
                        for (let fluid of core.entities.filter(e => (e.fluid && isParent(entityOnStove, e)))) {
                            newLine(`The stove heats up the ${fluid.baseName} in the ${entityOnStove.baseName}`);
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                newLine(`The ${entityOnStove.baseName} is filled with hot ${fluid.baseName}!`)
                            }
                        }
                    }
                    if (entityOnStove.flammable) {
                        newLine(`The ${entityOnStove.baseName} burns up`)
                        core.deleteById(entityOnStove.id);
                    }
                }
            }
        }
    }
});

receivers.push({
    on_tick: function(data) {
        for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
            for (let hotFluid of core.entities.filter(e => (
                    e.fluid &&
                    isParent(fluidContainer, e) &&
                    e.temperature > 23))) {
                // if infusable in container and hot fluid
                for (infusingTeabag of core.entities.filter(e => (
                        e.infusable &&
                        isParent(fluidContainer, e)))) {
                    hotFluid.baseName = `${infusingTeabag.flavour} tea`;
                    console.log("hotFluid", hotFluid);
                    emitSignal("teaMade");
                }
            }
        }
    }
})

core.addEntity({
    type: "winBehaviourState",
    baseName: "winBehaviourState",
    won: false,
});

receivers.push({
    on_teaMade: function(data) {
        let state = core.entities.filter(e => e.type === "winBehaviourState")[0];
        if (state.won === false) {
            newLine(`Congratulations, you have made tea`)
            state.won = true;
        }
    }
})


core.addEntity({
    baseName: "timer",
    type: "timer",
    time: 0
})

receivers.push({
    on_tick: function(data) {
        for (let timer of core.entities.filter(e => e.type === "timer")) {
            timer.time += 1;
            newLine(`Time: ${timer.time}`);
        }
    }
})

function emitSignal(type, data) {
    for (let receiver of receivers) {
        if (receiver[`on_${type}`])
            receiver[`on_${type}`](data);
    }
}

updateCommandUI(player);

core.addEntity(player, area);

emitSignal("playerTick", {});
let time = 0;
// setOptions();

for (let entity of core.entities) {
    console.log(entity.baseName, core.getDepth(entity))
}


function updateEntityTreeUI() {
    let text = ""

    function indentedSubtree(id, depth = 0) {
        let entity = core.getById(id);
        if (!entity.baseName) return "";
        text = "|" + "----".repeat(core.getDepth(entity)) + entity.baseName + "\n";
        for (let child of core.childrenOf(entity).filter(e => core.isAccessible(e))) {
            text += indentedSubtree(child.id, depth + 1);
        }
        return text;
    }

    for (let entity of core.entities.filter(e => core.getDepth(e) === 0)) {
        text += indentedSubtree(entity.id, 0);
    }
    document.getElementById("entityTree").innerText = text;
}
setInterval(() => {
    updateEntityTreeUI();
}, 500);

// console.log("top")
// console.log(core.entities.filter(e => core.getDepth(e) === 0))
// player.addPattern({
//     actions: function() {
//         let actions = [];
//         // the effect function
//         function clap() {
//             newLine("CLAP!")
//         }
//         // the queue
//         actions.push({
//             representation: [words.get("slow clap.")],
//             queue: [4, clap, 2, clap, clap, 1, clap, clap, clap],
//             condition: function() {},
//         })
//         return actions;
//     }
// })


// console.log(core.entities.filter(e => core.getDepth(e) === 0))
// player.addPattern({
//     actions: function() {
//         let actions = [];
//         // the effect function
//         function pop() {
//             newLine("POP!")
//         }
//         // the queue
//         actions.push({
//             representation: [words.get("pop.")],
//             queue: [pop, pop, pop],
//             condition: function() {},
//         })
//         return actions;
//     }
// })


player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.lockedContainer && e.locked && core.isAccessible(e))) {
            for (let i0 = 0; i0 < 10; i0++) {
                for (let i1 = 0; i1 < 10; i1++) {
                    for (let i2 = 0; i2 < 10; i2++) {
                        // the queue
                        function tryPassword() {
                            if (`${i0}${i1}${i2}` === entity.lockedContainer.password) {
                                entity.locked = false;
                                newLine("The locks click open.")
                            } else {
                                newLine("Incorrect.")
                            }
                        }
                        actions.push({
                            representation: [words.get(`unlock`), entity, words.get(String(i0)), words.get(String(i1)), words.get(String(i2))],
                            queue: [tryPassword],
                            condition: function() {},
                        })
                    }
                }
            }
        }
        return actions;
    }
});

player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.note)) {
            // the queue
            actions.push({
                representation: [words.get(`read`), entity],
                queue: [() => {
                    newLine("You read the note...");
                    newLine(entity.note.content)
                }],
                condition: function() {},
            })
        }
        return actions;
    }
});

player.addPattern({
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.closed && core.isAccessible(e))) {
            function effect() {
                if (entity.locked) {
                    newLine(`The ${entity.baseName} seems to be locked...`)
                } else {
                    entity.closed = false;
                    newLine(`You open the ${entity.baseName}`);
                    newLine(`It contains: ${core.childrenOf(entity).map(e => e.baseName).join(",")}`);
                }
            }
            actions.push({
                representation: [words.get(`open`), entity],
                queue: [effect],
                condition: function() {},
            })
        }
        return actions;
    }
});

let note = { baseName: "super secret note", note: { content: `It reads: "The password is 6 1 5"` } };
core.addEntity(note, table);
/*
player
    queue: [4, clap, 1, clap, clap, 1, clap, 2]
    intent: {action}
*/
/// debug test

function debug(text) {
    document.getElementById("debug").innerText = text;
}

// player tick manager
receivers.push({
    on_playerTick: function(data) {
        // player: no effect, wind-up, or wind-down
        if (player.intent === undefined) {
            if (player.picking === false) {
                setOptions(player);
                player.picking = true;
            }
        } else {
            let queue = player.intent.queue;
            console.log("in queue");
            // waiting time, tick everything else
            while (typeof queue[0] === "function") {
                // execute effect, another player tick afterwards
                queue[0]();
                queue.splice(0, 1);
            }

            if (typeof queue[0] === "number" && queue[0] > 0) {
                queue[0] -= 1;
                if (queue[0] <= 0) {
                    queue.splice(0, 1);
                }
                emitSignal("tick", {});
            }

            if (queue.length === 0) {
                player.intent = undefined;
            }
        }
    }
})


setInterval(() => {
    emitSignal("playerTick", {})
}, 1000 / 20);
// core.ready = false;

// function loop() {

//     if (core.ready) {
//         setTimeout(() => {
//             loop()
//         }, 1000 / 60);
//     } else {

//     }
// }

// loop()

function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}
},{}]},{},[1]);
