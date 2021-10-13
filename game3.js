class Core {
    constructor() {
        this.id = 0;
        this.entities = [];
        this.intentsReady = true;
        this.signalsReady = true;
        this.executeReady = true;
        this.queue = []; // [Action*]
        this.receivers = []; // {on_signalType:func()}
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

    enqueue(action, i = -1) {
        if (i === -1) {
            this.queue.push(action)
        } else {
            this.queue.splice(i, 0, action);
        }
    }

    getIntents() {
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.queue = [];
        this.intentsReady = true;
        for (let entity of this.entities) {
            // empty intent
            if (entity.intent === null || (entity.intent && entity.intent.sequence.length === 0)) {
                this.intentsReady = false;
                // hang and reset for player input
                if (entity.player) {
                    if (!entity.picking) {
                        setOptions(entity);
                        entity.picking = true;
                    }
                    setTimeout(() => {
                        this.getIntents();
                    }, 100);
                }
            } else if (entity.intent) {
                // extract actions and enqueue them
                let sequence = entity.intent.sequence;
                if (!sequence || sequence.length === 0) throw `no sequence of actions on entity with intent`;
                let ticks = 0;
                let i = 0;

                // extract actions until we go over 1 tick
                while (ticks === 0 && i < sequence.length) {
                    let action = sequence[i];
                    this.enqueue(action);
                    console.log(`queued up`, action);

                    // queue up actions including the first with duration
                    if (action.duration <= 1 || action.duration === undefined) {
                        // instant action, keep queueing
                        sequence.splice(i, 1);
                    } else if (action.duration > 1) {
                        // action that will be taken multiple times
                        ticks = action.duration;
                        console.log(`action with ${ticks} duration`, action);
                        action.duration -= 1;
                    } else {
                        throw `Not sure what this means`;
                    }
                }
            }
        }
        // queue up a tick signal
        this.queue.push({ signals: [{ type: "tick" }] });
        // when ready, propagate signals
        if (this.intentsReady) {
            this.propagateSignals();
        }
    }

    propagateSignals() {
        // run through signal propagation and clearing, instant
        this.signalsReady = false;
        while (!this.signalsReady) {
            this.signalsReady = true;
            // for every unpropagated action with signals, propagate and clear signals
            for (let action of this.queue.filter(a => !a.propagated && a.signals && a.signals.length > 0)) {
                for (let signal of action.signals) {
                    // new signal to propagate
                    this.signalsReady = false
                    let type = signal.type;
                    console.log("propagating", type);
                    // send to every receiver
                    for (let receiver of this.receivers) {
                        if (receiver[`on_${type}`]) {
                            receiver[`on_${type}`](signal);
                        }
                    }
                }
                // mark as propagated
                action.propagated = true;
            }
        }
        console.log("done propagating signals. queue:");
        console.log(this.queue);
        // reset propagation for actions with duration
        for (let action of this.queue.filter(a => a.propagated === true)) {
            action.propagated = false;
        }
        this.executeNext();
    }

    executeNext() {
        if (this.queue.length > 0) {
            let action = this.queue.shift();
            console.log("executing", action);
            if (action.condition === undefined || action.condition() === true) {
                if (action.effect) {
                    action.effect();
                }
                if (action.pause) {
                    setTimeout(() => { this.executeNext() }, action.pause);
                } else {
                    this.executeNext();
                }
            }
        } else {
            this.getIntents();
        }
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
        this.baseName = "player";
        this.player = true;
        this.core = core;
        this.intent = null; // intent
        this.picking = false;
        this.command = [];
        this.patterns = [];
    }

    addPattern(pattern) {
        this.patterns.push(pattern);
    }

    getAllIntents() {
        let intents = []
        for (let pattern of this.patterns) {
            for (let intent of pattern.intents()) {
                intents.push(intent);
            }
        }
        return intents;
    }

    //^ getAllIntents(), command
    getValidIntents() {
        // get remaining Intents that match the command so far
        let validIntents = [];
        for (let intent of this.getAllIntents()) {
            let valid = true;
            for (let i = 0; i < this.command.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    // console.log(intent.representation[i].baseName, "invalid")
                    valid = false;
                } else {
                    // console.log(intent.representation[i].baseName, "valid")
                }
            }
            if (valid) {
                validIntents.push(intent);
            }
        }
        return validIntents;
    }



    //^ getValidIntents(), command
    // get options for next word to pick
    getNextWords() {
        let options = [];
        let validIntents = this.getValidIntents();

        console.log(`${validIntents.length} valid commands at command.length ${player.command.length}`)
        for (let intent of validIntents) {
            // console.log(`studying ${intent.representation.map(e => e.baseName)}`);
            // console.log(intent);
            // if the intent is the same length as the command, it can be setIntentd
            if (intent.representation.length == player.command.length) {
                options.push({ baseName: "setIntent" })
            } else {
                let newOption = intent.representation[player.command.length];
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


    // getValidIntents(), player, clearCommand()
    // set intent and clear the command
    setIntent() {
        // get valid intents
        let intents = this.getValidIntents();
        if (intents.length !== 1) {
            throw "EXECUTION ERROR, NOT ONE VALID ACTION"
        }
        let intent = intents[0];
        console.log(`intending ${intent.representation.map(e => e.baseName)}`);

        // set intent, not picking
        this.intent = intent;
        this.picking = false;

        // clear command
        this.command = [];
        updateCommandUI(this);
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


// player.addPattern({
//     // fill container from fluidSource
//     intents: function() {
//         let intents = [];
//         for (let fluidSource of core.entities.filter(e => e.fluidSource)) {
//             for (let container of core.entities.filter(e => e.fluidContainer)) {
//                 // check the container is empty, no fluids in container
//                 let fluidsInContainer = core.entities.filter(e => e.fluid && isParent(container, e));
//                 // console.log("fluids", fluidsInContainer);
//                 if (fluidsInContainer.length === 0) {
//                     function effect() {
//                         let fluid = { baseName: fluidSource.fluid, fluid: true, temperature: fluidSource.temperature }
//                         newLine(`You fill up the ${container.baseName} from the ${fluidSource.baseName} with ${fluid.baseName}`)
//                         core.addEntity(fluid);
//                         setParent(container, fluid);
//                     }
//                     intents.push({
//                         representation: [words.get("fill"), container, words.get("from"), fluidSource],
//                         sequence: [2, effect, 3],
//                         // condition: function() {
//                         //     return core.getById(fluidSource.id) && core.getById(container.id);
//                         // },
//                     });
//                 }
//                 // throw "HALT"
//             }
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     // empty container
//     intents: function() {
//         let intents = [];
//         for (let container of core.entities.filter(e => e.fluidContainer)) {
//             if (core.childrenOf(container).length !== 0) {
//                 function effect() {
//                     newLine(`You empty the ${container.baseName}.`);
//                     for (let entity of core.entities) {
//                         if (isParent(container, entity)) {
//                             console.log("deleting", entity);
//                             console.log("all entities")
//                             console.log(core.entities);
//                             core.deleteById(entity.id);
//                         }
//                     }
//                 }
//                 intents.push({
//                     representation: [words.get("empty"), container],
//                     sequence: [1, effect, 1],
//                 });
//             }
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     // pour X into Y
//     intents: function() {
//         let intents = [];
//         let nonemptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length !== 0)))
//         let emptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length === 0)))
//         for (let sourceContainer of core.entities.filter(nonemptyContainer)) {
//             for (let destinationContainer of core.entities.filter(emptyContainer)) {
//                 function effect() {
//                     for (let entity of core.entities) {
//                         if (isParent(sourceContainer, entity)) {
//                             newLine(`You pour the ${entity.baseName} from the ${sourceContainer.baseName} into the ${destinationContainer.baseName}.`);
//                             setParent(destinationContainer, entity);
//                         }
//                     }
//                 }
//                 intents.push({
//                     representation: [words.get("pour"), sourceContainer, words.get("into"), destinationContainer],
//                     sequence: [1, effect, 1]
//                 });
//             }
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.item && core.isAccessible(e))) {
//             for (let surface of core.entities.filter(e => e.surface)) {
//                 function effect() {
//                     newLine(`You put the ${entity.baseName} on the ${surface.baseName}`);
//                     entity.parent = surface.id;
//                     console.log(entity);
//                 }
//                 intents.push({
//                     representation: [words.get("put"), entity, words.get("on"), surface],
//                     sequence: [1, effect],
//                 });
//             }
//         }
//         return intents;
//     }
// });


// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let infusable of core.entities.filter(e => e.infusable && core.isAccessible(e))) {
//             for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
//                 function effect() {
//                     newLine(`You put the ${infusable.baseName} in the ${fluidContainer.baseName} for infusing`);
//                     setParent(fluidContainer, infusable);
//                 }
//                 intents.push({
//                     representation: [words.get("put"), infusable, words.get("in"), fluidContainer],
//                     sequence: [1, effect, 1]
//                 });
//             }
//         }
//         // return [];
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.active !== undefined && e.active === false)) {
//             function effect() {
//                 entity.active = true;
//                 newLine(`You turn on the ${entity.baseName}`)
//             }
//             intents.push({
//                 representation: [words.get("turn on"), entity],
//                 sequence: [effect]
//             });
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.active !== undefined && e.active === true)) {
//             function effect() {
//                 entity.active = false;
//                 newLine(`You turn off the ${entity.baseName}`)
//             }
//             intents.push({
//                 representation: [words.get("turn off"), entity],
//                 sequence: [effect],
//             });
//         }
//         // return [];
//         return intents;
//     }
// });



// player.addPattern({
//     intents: function() {
//         let intents = [];
//         let flavours = ["mint", "chamomile", "cranberry"];
//         for (let flavour of flavours) {
//             let teabag = { baseName: `${flavour} teabag`, item: true, flammable: true, infusable: true, flavour: flavour };

//             function effect() {
//                 core.addEntity(teabag);
//                 newLine(`You grab a ${flavour} teabag`);
//             }
//             intents.push({
//                 representation: [words.get("take"), words.get(`${flavour} teabag`)],
//                 sequence: [2, effect]
//             });
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         // TODO: if there is tea, drink the tea
//         intents.push({
//             representation: [words.get("Enjoy the lovely cup of tea")],
//             windup: 3,
//             winddown: 3,
//             condition: function() {},
//             effect: function() {
//                 newLine("You sip the cup of tea peacefully.")
//             }
//         });
//         return intents;
//     }
// })


// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.lockedContainer && e.locked && core.isAccessible(e))) {
//             for (let i0 = 0; i0 < 10; i0++) {
//                 for (let i1 = 0; i1 < 10; i1++) {
//                     for (let i2 = 0; i2 < 10; i2++) {
//                         // the sequence
//                         function tryPassword() {
//                             if (`${i0}${i1}${i2}` === entity.lockedContainer.password) {
//                                 entity.locked = false;
//                                 newLine("The locks click open.")
//                             } else {
//                                 newLine("Incorrect.")
//                             }
//                         }
//                         intents.push({
//                             representation: [words.get(`unlock`), entity, words.get(String(i0)), words.get(String(i1)), words.get(String(i2))],
//                             sequence: [tryPassword],
//                             condition: function() {},
//                         })
//                     }
//                 }
//             }
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.note)) {
//             // the sequence
//             intents.push({
//                 representation: [words.get(`read`), entity],
//                 sequence: [() => {
//                     newLine("You read the note...");
//                     newLine(entity.note.content)
//                 }],
//                 condition: function() {},
//             })
//         }
//         return intents;
//     }
// });

// player.addPattern({
//     intents: function() {
//         let intents = [];
//         for (let entity of core.entities.filter(e => e.closed && core.isAccessible(e))) {
//             function effect() {
//                 if (entity.locked) {
//                     newLine(`The ${entity.baseName} seems to be locked...`)
//                 } else {
//                     entity.closed = false;
//                     newLine(`You open the ${entity.baseName}`);
//                     newLine(`It contains: ${core.childrenOf(entity).map(e => e.baseName).join(",")}`);
//                 }
//             }
//             intents.push({
//                 representation: [words.get(`open`), entity],
//                 sequence: [effect],
//                 condition: function() {},
//             })
//         }
//         return intents;
//     }
// });

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


// core.receivers.push({
//     on_tick: function(data) {
//         for (let stove of core.entities.filter(e => e.baseName === "stove")) {
//             if (stove.active) {
//                 if (stove.ctr >= 10) {
//                     stove.ctr = 0;
//                     newLine("The stove's flame burns a warm orange.")
//                 }
//                 for (let entityOnStove of core.entities.filter(e => (e.parent === stove.id))) {
//                     // newLine(`The stove heats up the ${entityOnStove.baseName}`)
//                     if (entityOnStove.fluidContainer) {
//                         for (let fluid of core.entities.filter(e => (e.fluid && isParent(entityOnStove, e)))) {
//                             newLine(`The stove heats up the ${fluid.baseName} in the ${entityOnStove.baseName}`);
//                             fluid.temperature += 1;
//                             if (fluid.temperature == 23) {
//                                 newLine(`The ${entityOnStove.baseName} is filled with hot ${fluid.baseName}!`)
//                             }
//                         }
//                     }
//                     if (entityOnStove.flammable) {
//                         newLine(`The ${entityOnStove.baseName} burns up`)
//                         core.deleteById(entityOnStove.id);
//                     }
//                 }
//             }
//         }
//     }
// });

// core.receivers.push({
//     on_tick: function(data) {
//         for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
//             for (let hotFluid of core.entities.filter(e => (
//                     e.fluid &&
//                     isParent(fluidContainer, e) &&
//                     e.temperature > 23))) {
//                 // if infusable in container and hot fluid
//                 for (infusingTeabag of core.entities.filter(e => (
//                         e.infusable &&
//                         isParent(fluidContainer, e)))) {
//                     hotFluid.baseName = `${infusingTeabag.flavour} tea`;
//                     console.log("hotFluid", hotFluid);
//                     emitSignal("teaMade");
//                 }
//             }
//         }
//     }
// })

// core.addEntity({
//     type: "winBehaviourState",
//     baseName: "winBehaviourState",
//     won: false,
// });

// core.receivers.push({
//     on_teaMade: function(data) {
//         let state = core.entities.filter(e => e.type === "winBehaviourState")[0];
//         if (state.won === false) {
//             newLine(`Congratulations, you have made tea`)
//             state.won = true;
//         }
//     }
// })


core.addEntity({
    baseName: "timer",
    type: "timer",
    time: 0
})

core.receivers.push({
    on_tick: function(data) {
        for (let timer of core.entities.filter(e => e.type === "timer")) {
            timer.time += 1;
            newLine(`Time: ${timer.time}`);
        }
    }
})


updateCommandUI(player);

core.addEntity(player, area);

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


// player.addPattern({
//     durations: [{ baseName: "a bit", dur: 1 }, { baseName: "a while", dur: 5 }, { baseName: "a long time", dur: 10 }],
//     intents: function() {
//         let intents = [];
//         for (let duration of this.durations) {
//             function effect() {
//                 newLine(`You wait ${duration.baseName}`)
//             }
//             intents.push({
//                 representation: [words.get("wait"), words.get(duration.baseName)],
//                 sequence: [effect, duration.dur]
//             });
//         }
//         return intents;
//     }
// });
// console.log("top")
// console.log(core.entities.filter(e => core.getDepth(e) === 0))
// player.addPattern({
//     intents: function() {
//         let intents = [];
//         // the effect function
//         function clap() {
//             newLine("CLAP!")
//         }
//         // the sequence
//         intents.push({
//             representation: [words.get("slow clap.")],
//             sequence: [4, clap, 2, clap, clap, 1, clap, clap, clap],
//             condition: function() {},
//         })
//         return intents;
//     }
// })

function createWait(ticks) {
    return {
        duration: ticks
    }
}

console.log(core.entities.filter(e => core.getDepth(e) === 0))
player.addPattern({
    intents: function() {
        let intents = [];
        // the effect function
        function action() {
            return {
                effect: () => { newLine("Ping!") },
                condition: () => true,
                pause: 0,
                signals: [{ type: "ping" }],
                duration: 0
            }
        }
        // the sequence
        intents.push({
            representation: [words.get("3 x ping.")],
            sequence: [action(), action(), action()],
        })
        return intents;
    }
})

player.addPattern({
    intents: function() {
        let intents = [];
        // the effect function
        function action() {
            return {
                effect: () => { newLine("zing!") },
                condition: () => true,
                pause: 300,
                signals: [{ type: "ping" }],
                duration: 2,
            }
        }
        // the sequence
        intents.push({
            representation: [words.get("zing.")],
            sequence: [action()],
        })
        return intents;
    }
})


player.addPattern({
    intents: function() {
        let intents = [];
        // the effect function
        function action() {
            return {
                effect: () => newLine("Waited 5 ticks"),
            }
        }
        // the sequence
        intents.push({
            representation: [words.get("wait 5 ticks")],
            sequence: [
                createWait(5), action()
            ],
        })
        return intents;
    }
})


core.receivers.push({
    on_ping: function(data) {
        core.enqueue({
            effect: () => newLine("Pong!"),
            signals: [{ type: "pong" }],
            pause: 300,
        })
    }
})

core.receivers.push({
    on_pong: function(data) {
        core.enqueue({
            effect: () => newLine("Peng!"),
            signals: [{ type: "peng" }],
            pause: 300,
        })
    }
})

let note = { baseName: "super secret note", note: { content: `It reads: "The password is 6 1 5"` } };
core.addEntity(note, table);
/*
player
    sequence: [4, clap, 1, clap, clap, 1, clap, 2]
    intent: {intent}
*/
/// debug test

function debug(text) {
    document.getElementById("debug").innerText = text;
}

core.getIntents();

function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}