(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
let utils = require("./utils")
let newLine = utils.newLine;

class Game {
    constructor() {
        this.id = 0;
        this.entities = [];
        this.words = {};
        this.intentsReady = true;
        this.signalsReady = true;
        this.queue = []; // [Action*]
        this.receivers = []; // {on_signalType:func()}
        this.time = 0;
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
        let contents = this.entities.filter(e => utils.isParent(entity, e));
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

    emitSignal(data) {
        for (let receiver of this.receivers) {
            if (receiver[`on_${data.type}`]) {
                receiver[`on_${data.type}`](data);
            }
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
                        entity.setOptionsUI();
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
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueing
                        sequence.splice(i, 1);
                    } else if (action.duration > 0) {
                        // action that will be taken multiple times
                        ticks = action.duration;
                        // end actions here
                        if (action.duration <= 1) {
                            sequence.splice(i, 1);
                        }
                        console.log(`action with ${ticks} duration`, action);
                        // TODO: make multiple intent declarations possible per tick?
                        action.duration -= 1;
                    } else {
                        // throw `Not sure what this means`;
                    }
                }
            }
        }
        // when ready, propagate signals
        if (this.intentsReady) {
            // queue up a tick signal
            this.queue.push({ signals: [{ type: "tick" }] });
            // newLine(`starting tick ${game.time}`);
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
            this.time += 1;
            this.updateEntityTreeUI();
            this.getIntents();
        }
    }

    word(text) {
        if (!this.words[text]) {
            let word = { type: "word", baseName: text };
            this.words[text] = word;
        }
        return this.words[text];
    }

    updateEntityTreeUI() {
        let text = `Time: ${this.time}\n\n`;
        let game = this;

        function indentedSubtree(id, depth = 0) {
            let entity = game.getById(id);
            if (!entity.baseName) return "";
            let healthText = (entity.health > 0 ? `[${"#".repeat(entity.health)}]` : "")
            text = `|${"----".repeat(game.getDepth(entity))}${entity.baseName} ${healthText}\n`;
            for (let child of game.childrenOf(entity).filter(e => game.isAccessible(e))) {
                text += indentedSubtree(child.id, depth + 1);
            }
            return text;
        }

        for (let entity of this.entities.filter(e => this.getDepth(e) === 0)) {
            text += indentedSubtree(entity.id, 0);
        }
        document.getElementById("entityTree").innerText = text;
    }
}


module.exports = { Game };
},{"./utils":7}],2:[function(require,module,exports){
class Player {
    constructor(game) {
        this.baseName = "player";
        this.player = true;
        this.game = game;
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

        console.log(`${validIntents.length} valid commands at command.length ${this.command.length}`)
        for (let intent of validIntents) {
            // console.log(`studying ${intent.representation.map(e => e.baseName)}`);
            // console.log(intent);
            // if the intent is the same length as the command, it can be confirmed
            if (intent.representation.length == this.command.length) {
                options.push({ baseName: "> confirm <" })
            } else {
                let newOption = intent.representation[this.command.length];
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

        this.updateCommandUI();
    }


    // getValidIntents(), clearCommand()
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
        this.updateCommandUI();
    }

    updateCommandUI() {
        console.trace("WIP");
        document.getElementById("command").innerHTML = ">" + this.command.map(e => e.baseName).join(" ");
    }


    clearOptionsUI() {
        document.getElementById('options').innerHTML = "";
    }

    setOptionsUI() {
        document.getElementById('options').innerHTML = "";
        // get the next words, and create an element for each on document
        let options = this.getNextWords();
        for (let i = 0; i < options.length; i++) {
            let optionText = options[i].baseName;
            // create a span with the optionText baseName
            var node = document.createElement("a");
            node.className = "choice";
            node.innerText = optionText;
            document.getElementById('options').appendChild(node);
            // when the span is clicked, handle using that optionText
            if (optionText === "> confirm <") {
                node.addEventListener("click", () => {
                    this.setIntent();
                    this.clearOptionsUI();
                });
            } else {
                node.addEventListener("click", () => {
                    this.pickNextWord(i);
                    this.setOptionsUI();
                });
            }
        }

        // create a cancel node if there's a command
        if (this.command.length > 0) {
            let cancelNode = document.createElement("a");
            cancelNode.className = "cancel";
            cancelNode.innerText = "cancel";
            document.getElementById('options').appendChild(cancelNode);
            cancelNode.addEventListener("click", () => {
                this.command = [];
                this.setOptionsUI();
                this.updateCommandUI();
            });
        }
    }
}




module.exports = { Player }
},{}],3:[function(require,module,exports){
let createWait = require("./actions").createWait;
let utils = require("./utils");
let newLine = utils.newLine;

function addPatterns(player, game) {
    player.addPattern({
        durations: [{ baseName: "a bit", dur: 1 }, { baseName: "a while", dur: 10 }, { baseName: "a long time", dur: 20 }],
        intents: function() {
            let intents = [];
            for (let duration of this.durations) {
                function effect() {
                    newLine(`You wait ${duration.baseName}`)
                }
                intents.push({
                    representation: [game.word("wait"), game.word(duration.baseName)],
                    sequence: [{ effect }, createWait(duration.dur)]
                });
            }
            return intents;
        }
    });
    // console.log("top")
    // console.log(game.entities.filter(e => game.getDepth(e) === 0))
    player.addPattern({
        intents: function() {
            let intents = [];
            // the effect function
            function effect() {
                newLine("CLAP!")
            }
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("slow clap.")],
                sequence: [createWait(4), effect, createWait(2), effect, effect, createWait(2), effect, effect, effect],
                condition: function() {},
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
                    effect: () => { newLine("Ping!") },
                    condition: () => true,
                    pause: 0,
                    signals: [{ type: "ping" }],
                    duration: 0
                }
            }
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("3 x ping.")],
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
                representation: [game.word("DEBUG"), game.word("zing.")],
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
                    effect: () => newLine("Waiting 3 ticks"),
                }
            }
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("empty wait 3 ticks")],
                sequence: [
                    createWait(3),
                ],
            })
            return intents;
        }
    })


    player.addPattern({
        // fill container from fluidSource
        intents: function() {
            let intents = [];
            for (let fluidSource of game.entities.filter(e => e.fluidSource)) {
                for (let container of game.entities.filter(e => e.fluidContainer)) {
                    // check the container is empty, no fluids in container
                    let fluidsInContainer = game.entities.filter(e => e.fluid && utils.isParent(container, e));
                    // console.log("fluids", fluidsInContainer);
                    if (fluidsInContainer.length === 0) {
                        function effect() {
                            let fluid = { baseName: fluidSource.fluid, fluid: true, temperature: fluidSource.temperature }
                            newLine(`You fill up the ${container.baseName} from the ${fluidSource.baseName} with ${fluid.baseName}`)
                            game.addEntity(fluid);
                            utils.setParent(container, fluid);
                        }
                        intents.push({
                            representation: [game.word("fill"), container, game.word("from"), fluidSource],
                            sequence: [createWait(3), { effect }, createWait(3)],
                            // condition: function() {
                            //     return game.getById(fluidSource.id) && game.getById(container.id);
                            // },
                        });
                    }
                    // throw "HALT"
                }
            }
            return intents;
        }
    });

    player.addPattern({
        // empty container
        intents: function() {
            let intents = [];
            for (let container of game.entities.filter(e => e.fluidContainer)) {
                if (game.childrenOf(container).length !== 0) {
                    function effect() {
                        newLine(`You empty the ${container.baseName}.`);
                        for (let entity of game.entities) {
                            if (utils.isParent(container, entity)) {
                                console.log("deleting", entity);
                                console.log("all entities")
                                console.log(game.entities);
                                game.deleteById(entity.id);
                            }
                        }
                    }
                    intents.push({
                        representation: [game.word("empty"), container],
                        sequence: [createWait(1), { effect }, createWait(1)],
                    });
                }
            }
            return intents;
        }
    });

    player.addPattern({
        // pour X into Y
        intents: function() {
            let intents = [];
            let nonemptyContainer = (e => (e.fluidContainer && (game.childrenOf(e).length !== 0)))
            let emptyContainer = (e => (e.fluidContainer && (game.childrenOf(e).filter(e => e.fluid).length === 0)))
            for (let sourceContainer of game.entities.filter(nonemptyContainer)) {
                for (let destinationContainer of game.entities.filter(emptyContainer)) {
                    function effect() {
                        for (let entity of game.entities) {
                            if (utils.isParent(sourceContainer, entity)) {
                                newLine(`You pour the ${entity.baseName} from the ${sourceContainer.baseName} into the ${destinationContainer.baseName}.`);
                                utils.setParent(destinationContainer, entity);
                            }
                        }
                    }
                    intents.push({
                        representation: [game.word("pour"), sourceContainer, game.word("into"), destinationContainer],
                        sequence: [{ effect }]
                    });
                }
            }
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.item && game.isAccessible(e))) {
                for (let surface of game.entities.filter(e => e.surface)) {
                    function effect() {
                        newLine(`You put the ${entity.baseName} on the ${surface.baseName}`);
                        entity.parent = surface.id;
                        entity.rel = "on";
                        console.log(entity);
                    }
                    intents.push({
                        representation: [game.word("put"), entity, game.word("on"), surface],
                        sequence: [{ effect }],
                    });
                }
            }
            return intents;
        }
    });


    player.addPattern({
        intents: function() {
            let intents = [];
            for (let infusable of game.entities.filter(e => e.infusable && game.isAccessible(e))) {
                for (let fluidContainer of game.entities.filter(e => e.fluidContainer)) {
                    function effect() {
                        newLine(`You put the ${infusable.baseName} in the ${fluidContainer.baseName} for infusing`);
                        utils.setParent(fluidContainer, infusable);
                    }
                    intents.push({
                        representation: [game.word("put"), infusable, game.word("in"), fluidContainer],
                        sequence: [{ effect }]
                    });
                }
            }
            // return [];
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.active !== undefined && e.active === false)) {
                function effect() {
                    entity.active = true;
                    newLine(`You turn on the ${entity.baseName}`)
                }
                intents.push({
                    representation: [game.word("turn on"), entity],
                    sequence: [{ effect }]
                });
            }
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.active !== undefined && e.active === true)) {
                function effect() {
                    entity.active = false;
                    newLine(`You turn off the ${entity.baseName}`)
                }
                intents.push({
                    representation: [game.word("turn off"), entity],
                    sequence: [{ effect }],
                });
            }
            // return [];
            return intents;
        }
    });



    // player.addPattern({
    //     intents: function() {
    //         let intents = [];
    //         // TODO: if there is tea, drink the tea
    //         intents.push({
    //             representation: [game.word("Enjoy the lovely cup of tea")],
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


    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.lockedContainer && e.locked && game.isAccessible(e))) {
                for (let i0 = 0; i0 < 10; i0++) {
                    for (let i1 = 0; i1 < 10; i1++) {
                        for (let i2 = 0; i2 < 10; i2++) {
                            // the sequence
                            function effect() {
                                if (`${i0}${i1}${i2}` === entity.lockedContainer.password) {
                                    entity.locked = false;
                                    newLine("The locks click open.")
                                } else {
                                    newLine("Incorrect.")
                                }
                            }
                            intents.push({
                                representation: [game.word(`unlock`), entity, game.word(String(i0)), game.word(String(i1)), game.word(String(i2))],
                                sequence: [{ effect }],
                                condition: function() {},
                            })
                        }
                    }
                }
            }
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.note)) {
                // the sequence
                intents.push({
                    representation: [game.word(`read`), entity],
                    sequence: [{
                        effect: () => {
                            newLine("You read the note...");
                            newLine(entity.note.content)
                        }
                    }],
                })
            }
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.closed && game.isAccessible(e))) {
                function effect() {
                    if (entity.locked) {
                        newLine(`The ${entity.baseName} seems to be locked...`)
                    } else {
                        entity.closed = false;
                        newLine(`You open the ${entity.baseName}`);
                        newLine(`It contains: ${game.childrenOf(entity).map(e => e.baseName).join(",")}`);
                    }
                }
                intents.push({
                    representation: [game.word(`open`), entity],
                    sequence: [{ effect }],
                })
            }
            return intents;
        }
    });

    player.addPattern({
        intents: function() {
            let intents = [];
            let sounds = ["POW!", "Bam!", "Boom!", "Zock!"];
            for (let entity of game.entities.filter(e => e.health > 0)) {
                function effect() {
                    newLine(`You punch the ${entity.baseName}! ${sounds[Math.floor(Math.random() * sounds.length)]}`);
                    if (entity.health < 5) {
                        newLine(`Some fluff flies out of the ruptures. 1 damage!`);
                        entity.health -= 1;
                        game.emitSignal({ type: "damageDealt", by: player, to: entity });
                    }
                }
                intents.push({
                    representation: [game.word("attack"), entity, game.word("with fists")],
                    sequence: [createWait(5), { effect }, createWait(2), { effect }, createWait(2), { effect }, createWait(2)]
                })
            }
            return intents;
        }
    })

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.health > 0)) {
                let action0 = {
                    effect: () => {
                        if (entity.health === 5)
                            newLine(`You let out a piercing shriek as you ready your razor-sharp, glassy claws!`);
                        else
                            newLine(`You ready your claws again!`);
                    }
                }

                let action1 = {
                    effect: () => {
                        newLine(`You dig your claws into the ${entity.baseName}!`);
                    }
                }

                let action2 = {
                    effect: () => {
                        newLine(`You tear out the ${entity.baseName}'s insides for 2 damage!`);
                        entity.health -= 2;
                        game.emitSignal({ type: "damageDealt", by: player, to: entity });
                    },
                    signals: []
                }
                intents.push({
                    representation: [game.word("attack"), entity, game.word("with claws")],
                    sequence: [createWait(5), action0, createWait(10), action1, createWait(10), action2, createWait(5)]
                })
            }
            return intents;
        }
    })
}

module.exports = { addPatterns }
},{"./actions":5,"./utils":7}],4:[function(require,module,exports){
class UI {

    constructor() {}

}

module.exports = { UI }
},{}],5:[function(require,module,exports){
function createWait(ticks) {
    return {
        duration: ticks,
        pause: 100,
    }
}

module.exports = { createWait }
},{}],6:[function(require,module,exports){
let utils = require("./utils");
// HACK
let newLine = utils.newLine;
let GameModule = require("./GameModule");
let game = new GameModule.Game();

let PlayerModule = require("./PlayerModule");
let player = new PlayerModule.Player(game);

let UI = require("./UI").UI
let ui = new UI();

let teaRoomMod = require("./TeaRoom");
teaRoomMod.addPatterns(player, game);


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
console.log("ct:", cranberryTeabag);
let table = { baseName: "table", surface: true }
game.addEntity(table, area);
game.addEntity({ baseName: "cup", fluidContainer: true, item: true }, table);
game.addEntity({ baseName: "bowl", fluidContainer: true, item: true }, table);
let note = { baseName: "super secret note", note: { content: `It reads: "The password is 6 1 5"` } };
game.addEntity(note, table);
let chest = { baseName: "chest", closed: true, locked: true, lockedContainer: { password: `615` } };
game.addEntity(chest, table);
let smallerChest = { baseName: "smaller chest", closed: true };
game.addEntity(smallerChest, chest);
let evenSmallerChest = { baseName: "even smaller chest", closed: true };
game.addEntity(evenSmallerChest, smallerChest);

game.addEntity({ baseName: `SECRETIVE teabag`, item: true, flammable: true, infusable: true, flavour: "SECRET" }, evenSmallerChest);



game.receivers.push({
    on_damageDealt: function(data) {
        // newLine(`Damage dealt by ${data.by}`);
        if (data.to.health <= 0) {
            newLine(`You have defeated your first enemy, a vile ${data.to.baseName}.`);
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
                        for (let fluid of game.entities.filter(e => (e.fluid && utils.isParent(entityOnStove, e)))) {
                            // newLine(`The stove heats up the ${fluid.baseName} in the ${entityOnStove.baseName}`);
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                newLine(`The ${entityOnStove.baseName} is filled with hot ${fluid.baseName}!`)
                            }
                        }
                    }
                    if (entityOnStove.flammable) {
                        newLine(`The ${entityOnStove.baseName} burns up`)
                        game.deleteById(entityOnStove.id);
                    }
                }
            }
        }
    }
});

game.receivers.push({
    on_tick: function(data) {
        for (let fluidContainer of game.entities.filter(e => e.fluidContainer)) {
            for (let hotFluid of game.entities.filter(e => (
                    e.fluid &&
                    utils.isParent(fluidContainer, e) &&
                    e.temperature > 23))) {
                let count = 0;
                let prefix = "";
                // if infusable in container and hot fluid
                for (infusingTeabag of game.entities.filter(e => (
                        e.infusable &&
                        utils.isParent(fluidContainer, e)))) {
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
    time: -1
})

game.receivers.push({
    on_tick: function(data) {
        for (let timer of game.entities.filter(e => e.type === "timer")) {
            timer.time += 1;
            // newLine(`Time: ${timer.time}`);
        }
    }
})

game.receivers.push({
    on_ping: function(data) {
        game.enqueue({
            effect: () => newLine("Pong!"),
            signals: [{ type: "pong" }],
            pause: 300,
        })
    }
})

game.receivers.push({
    on_pong: function(data) {
        game.enqueue({
            effect: () => newLine("Peng!"),
            signals: [{ type: "peng" }],
            pause: 300,
        })
    }
})


player.updateCommandUI();
game.updateEntityTreeUI();
game.getIntents();

//^ document
function debug(text) {
    document.getElementById("debug").innerText = text;
}

// setInterval(() => {
//     debug(`int: ${game.intentsReady}  sig: ${game.signalsReady}`);
// }, 50);

//^ document
},{"./GameModule":1,"./PlayerModule":2,"./TeaRoom":3,"./UI":4,"./utils":7}],7:[function(require,module,exports){
function isParent(parentEntity, child) {
    return child.parent === parentEntity.id;
}

function setParent(parentEntity, child) {
    if (parentEntity === undefined || parentEntity.id === undefined) throw "Undefined parent."
    child.parent = parentEntity.id;
}

function unsetParent(child) {
    child.parent = undefined;
}

function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}

module.exports = { isParent, setParent, unsetParent, newLine };
},{}]},{},[6]);
