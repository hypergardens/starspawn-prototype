(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
let utils = require("./utils")
let newLine = utils.newLine;
let timing = require("./timing");

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
        this.focus = null;
        this.player = null;

        // overhaul
        this.actions = {};
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

    isParent(parentEntity, childEntity) {
        return childEntity.parent === parentEntity.id;
    }

    getChildrenById(id) {
        return this.getChildren(this.getById(id));
    }

    getChildren(entity) {
        let contents = this.entities.filter(e => this.isParent(entity, e));
        // if (contents.length > 0) console.log(contents)
        // console.log("children of", entity.baseName, contents)
        // if (contents.length === 0) console.log({ entity, contents })
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
        for (let entity of this.entities.filter(e => e.sequence)) {
            let sequence = entity.sequence;
            console.log({ sequence })
                // empty intent
            if (!sequence || (sequence && sequence.length === 0)) {
                this.intentsReady = false;
                // hang and reset for player input
                if (entity.player) {
                    if (!entity.picking) {
                        entity.picking = true;
                        entity.setOptionsUI();
                    }
                    setTimeout(() => {
                        let options = entity.getNextWords();
                        if (false) {
                            if (entity.command.length > 0) {
                                entity.pickNextWord(Math.floor(Math.random() * (options.length - 1)));
                            } else {
                                entity.pickNextWord(Math.floor(Math.random() * options.length));
                            }
                        }
                        this.getIntents();
                    }, 30);
                }
            } else if (sequence.length > 0) {
                // extract actions and enqueue them
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
        // get next action to execute
        if (this.queue.length > 0) {
            let action = this.queue.shift();
            console.log("executing", action);
            if (action.func) {
                if (this.actions[action.func]) {
                    let func = this.actions[action.func];
                    if (action.args) {
                        func(...action.args);
                    } else {
                        func();
                    }
                } else {
                    throw (`Unknown action ${action.func}, args ${action.args}`);
                }
            }
            // execute the next instantly or with pause
            if (action.pause) {
                setTimeout(() => { this.executeNext() }, action.pause);
            } else {
                this.executeNext();
            }
        } else {
            // loop again
            this.time += 1;
            this.updateUI();
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

    updateUI() {
        this.updateEntityTreeUI();
        this.updateClockUI();
    }

    updateEntityTreeUI() {
        let ticks = this.time % timing.tps;
        let hours = Math.floor(this.time / timing.tps / 3600)
        let minutes = Math.floor(this.time / timing.tps / 60)
        let seconds = Math.floor(this.time / timing.tps)
        let game = this;
        let treeNode = document.getElementById("entityTree");
        treeNode.innerHTML = `Time: ${hours}:${minutes}:${seconds}:${ticks}\n\n</br>`;

        function indentedSubtree(entity, depth = 0) {
            if (!entity.baseName || entity.invisible) return null;
            let healthText = (entity.health > 0 ? `[${"#".repeat(entity.health)}]` : "")

            let focusedText = (game.focus === entity.id) ? "(focused)" : "";
            let textNode = document.createElement("a");
            // textNode.style.color = "lightgrey";
            textNode.innerText = `|${"----".repeat(game.getDepth(entity))}${entity.baseName} ${healthText}${focusedText}\n`;
            textNode.className = "treeObject";
            if (game.getChildren(entity).length > 0) {
                for (let child of game.getChildren(entity).filter(e => game.isAccessible(e))) {
                    textNode.appendChild(indentedSubtree(child, depth + 1));
                }
            }

            // on click, focus action
            textNode.addEventListener("click", function(e) {
                e = window.event || e;
                if (this === e.target) {
                    game.focus = entity.id;
                    game.player.command = [];
                    game.player.setOptionsUI();
                }
                game.updateEntityTreeUI();
            });

            return textNode;
        }

        for (let entity of this.entities.filter(e => this.getDepth(e) === 0)) {
            let subtree = indentedSubtree(entity, 0);
            if (subtree) {
                treeNode.appendChild(subtree);
            }
        }
    }

    updateClockUI() {
        let clock = document.getElementById("clock");
        let ctx = clock.getContext("2d");
        let width = clock.clientWidth;
        let height = clock.clientHeight;
        // ctx.stroke = "white";
        ctx.clearRect(0, 0, width, height);
        ctx.fillText(`${this.time}`, width / 2 - 6, height / 2 + 5);

        // dots
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        for (let i = 0; i < 12; i++) {
            ctx.moveTo(20, 0);
            ctx.lineTo(25, 0);
            ctx.rotate(2 * Math.PI / 12);
        };
        ctx.stroke();
        ctx.restore();

        // ticks
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        ctx.rotate(2 * Math.PI * (this.time) / timing.tps);
        ctx.arc(10, 0, 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();

        // seconds

        // ticks
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        ctx.rotate(2 * Math.PI * this.time / timing.tps / 60);
        ctx.moveTo(10, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        ctx.restore();
    }
}


module.exports = { Game };
},{"./timing":6,"./utils":7}],2:[function(require,module,exports){
class Player {
    constructor(game) {
        this.baseName = "player";
        this.player = true;
        this.game = game;
        this.intent = null; // intent
        this.sequence = [];
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
        // get remaining Intents that match the command and focus so far
        let validIntents = [];
        for (let intent of this.getAllIntents()) {
            // check intent for command validity
            let cmdValid = true;
            for (let i = 0; i < this.command.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    cmdValid = false;
                }
            }

            // check intent for focus validity, if any focus
            let focusValid = this.game.focus ? false : true;
            for (let entity of intent.representation) {
                if (entity.id === this.game.focus) {
                    focusValid = true;
                }
            }
            if (cmdValid && focusValid) {
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

        console.log(`${validIntents.length} valid commands at command ${this.command.map(w => w.baseName)}`)
        for (let intent of validIntents) {
            // if the intent is the same length as the command, it can be confirmed
            if (intent.representation.length == this.command.length) {
                options.push({ baseName: "> confirm <", type: "confirm" })
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
        if (this.command.length > 0) {
            options.push({ baseName: "> cancel <", type: "cancel" })
        }
        return options;
    }


    //^ updateCommandUI()
    pickNextWord(optionI) {
        let options = this.getNextWords();
        if (options[optionI].type === "confirm") {
            this.setIntent();
        } else if (options[optionI].type === "cancel") {
            this.command = [];
            this.game.focus = null;
        } else {
            this.command.push(options[optionI]);
        }

        this.updateCommandUI();
    }


    // getValidIntents(), clearCommand()
    // set intent and clear the command
    setIntent() {
        // get valid intents
        let intents = this.getValidIntents();
        // from intents of command's length
        for (let intent of intents.filter(i => i.representation.length === this.command.length)) {
            console.log({ intent, command: this.command });

            let valid = true;
            for (let i = 0; i < intent.representation.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    console.log("execution wonk, not one valid action");
                    valid = false;
                }
            }
            if (valid) {
                // set intent, not picking
                this.sequence = intent.sequence;
                this.picking = false;
                this.game.focus = null;
                // clear command
                this.command = [];
                this.updateCommandUI();
                return;
            }
        }

    }

    updateCommandUI() {
        document.getElementById("command").innerHTML = ">" + this.command.map(e => e.baseName).join(" ");
    }


    clearOptionsUI() {
        document.getElementById('options').innerHTML = "";
    }

    setOptionsUI() {
        document.getElementById('options').innerHTML = "";
        if (!this.picking) return;

        // get the next words, and create an element for each on document
        let options = this.getNextWords();

        let keys = "abcdefghijklmnopqrstuwxyz".split("");

        for (let i = 0; i < options.length; i++) {
            let optionText = options[i].baseName;

            // create a span with the optionText baseName
            var shortcutNode = document.createElement("a");
            shortcutNode.style.color = "lightgrey";
            shortcutNode.innerText = `${keys[i]}) `;

            // keyboard shortcutNode
            var optionNode = document.createElement("a");
            optionNode.style.color = "white";
            optionNode.innerText = optionText;

            shortcutNode.appendChild(optionNode);
            document.getElementById('options').appendChild(shortcutNode);
            // when the span is clicked, handle using that optionText
            // REFACTOR: bad

            shortcutNode.addEventListener("click", () => {
                this.pickNextWord(i);
                this.setOptionsUI();
            });

            if (options[i].type === "confirm") {
                shortcutNode.className = "confirm";
            } else if (options[i].type === "cancel") {
                shortcutNode.className = "cancel";
            } else {
                shortcutNode.className = "choice";
            }
        }

    }
}




module.exports = { Player }
},{}],3:[function(require,module,exports){
class UI {

    constructor() {}

}

module.exports = { UI }
},{}],4:[function(require,module,exports){
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
},{"./GameModule":1,"./PlayerModule":2,"./UI":3,"./modTeaRoom":5,"./utils":7}],5:[function(require,module,exports){
let utils = require("./utils");
let newLine = utils.newLine;
let timing = require("./timing");

function loadMod(player, game) {

    game.actions.newLine = utils.newLine;

    game.actions.wait = function(ticks) {
        // game.actions.newLine(`Still waiting... of ${ticks}`);
    }

    function createNewLineAction(text) {
        return {
            func: "newLine",
            args: [text]
        }
    }

    function createWaitAction(ticks) {
        return {
            func: "wait",
            args: [ticks],
            duration: ticks,
            pause: timing.mpt / Math.pow(ticks, 1),
        }
    }

    // wait various durations
    player.patterns.push({
        intents: () => {
            let intents = [];
            let durations = [
                { baseName: "1 tick", dur: 1 },
                { baseName: "3 ticks", dur: 3 },
                { baseName: "6 ticks", dur: 6 },
                // { baseName: "12 ticks", dur: 12 },
                // { baseName: "60 ticks", dur: 60 },
            ]
            for (let duration of durations) {
                let intent = {
                    representation: [game.word("wait"), game.word(duration.baseName)],
                    sequence: [
                        createNewLineAction(`You wait ${duration.dur} ticks.`),
                        createWaitAction(duration.dur)
                    ]
                }
                intents.push(intent);
            }
            return intents;
        }
    });


    game.actions.fillFrom = function(fluidSourceId, fluidContainerId) {
        let fluidSource = game.getById(fluidSourceId);
        let fluidContainer = game.getById(fluidContainerId);
        let fluid = { baseName: fluidSource.fluid, fluid: true, temperature: fluidSource.temperature }
        newLine(`You fill up the ${fluidContainer.baseName} from the ${fluidSource.baseName} with ${fluid.baseName}`)
        game.addEntity(fluid);
        utils.setParent(fluidContainer, fluid);
    }

    function fluidsIn(fluidContainer) {
        let fluidChildren = game.getChildren(fluidContainer).filter(e => e.fluid);
        return fluidChildren.length > 0;
    }

    // fill container from fluidSource
    player.addPattern({
        intents: function() {
            let intents = [];
            for (let fluidSource of game.entities.filter(e => e.fluidSource)) {
                for (let nonEmptyFluidContainer of game.entities.filter(e => e.fluidContainer && !fluidsIn(e))) {
                    intents.push({
                        representation: [game.word("fill"), nonEmptyFluidContainer, game.word("from"), fluidSource],
                        sequence: [
                            createWaitAction(3),
                            {
                                func: "fillFrom",
                                args: [fluidSource.id, nonEmptyFluidContainer.id],
                                duration: 1,
                            },
                            createWaitAction(3)
                        ],
                    });
                    // throw "HALT"
                }
            }
            return intents;
        }
    });

    game.actions.emptyContainer = function(containerId) {
        let container = game.getById(containerId);
        let containerParent = game.getById(container.parent);
        newLine(`You empty the ${container.baseName} on the ${containerParent.baseName}.`);
        for (let child of game.getChildrenById(containerId)) {
            if (child.fluid) {
                game.deleteById(child.id)
            } else {
                utils.setParent(containerParent, child)
            }
        }
    }

    player.addPattern({
        // empty container
        intents: function() {
            let intents = [];
            // nonempty fluid containers
            for (let nonEmptyFluidContainer of game.entities.filter(e => e.fluidContainer && game.getChildren(e).length !== 0)) {
                intents.push({
                    representation: [game.word("empty"), nonEmptyFluidContainer],
                    sequence: [
                        createWaitAction(1),
                        {
                            func: "emptyContainer",
                            args: [nonEmptyFluidContainer.id]
                        },
                        createWaitAction(1)
                    ],
                });
            }
            return intents;
        }
    });

    game.actions.pourXintoY = function(sourceId, destinationId) {
        let source = game.getById(sourceId);
        let destination = game.getById(destinationId);

        for (let child of game.getChildren(source)) {
            newLine(`You pour the ${child.baseName} from the ${source.baseName} into the ${destination.baseName}.`);
            utils.setParent(destination, child);
        }
    }

    player.addPattern({
        // pour X into Y
        intents: function() {
            let intents = [];
            let isNonEmptyFluidContainer = (e => (e.fluidContainer && (game.getChildren(e).length !== 0)))
            let isEmptyContainer = (e => (e.fluidContainer && !fluidsIn(e)))
            for (let sourceContainer of game.entities.filter(isNonEmptyFluidContainer)) {
                for (let destinationContainer of game.entities.filter(isEmptyContainer)) {
                    intents.push({
                        representation: [game.word("pour"), sourceContainer, game.word("into"), destinationContainer],
                        sequence: [{
                            func: "pourXintoY",
                            args: [sourceContainer.id, destinationContainer.id]
                        }]
                    });
                }
            }
            return intents;
        }
    });


    game.actions.linkParent = function(parentId, childId, rel = null) {
        let parent = game.getById(parentId);
        let child = game.getById(childId);
        utils.setParent(parent, child);
        if (rel) {
            child.rel = rel;
        }
    }

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.item && game.isAccessible(e))) {
                for (let surface of game.entities.filter(e => e.surface)) {
                    intents.push({
                        representation: [game.word("put"), entity, game.word("on"), surface],
                        sequence: [createNewLineAction(`You put the ${entity.baseName} on the ${surface.baseName}`), {
                            func: "linkParent",
                            args: [surface.id, entity.id, "on"]
                        }],
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
                    intents.push({
                        representation: [game.word("put"), infusable, game.word("in"), fluidContainer],
                        sequence: [{
                            func: "linkParent",
                            args: [fluidContainer.id, infusable.id, "in"]
                        }]
                    });
                }
            }
            return intents;
        }
    });


    game.actions.switchActive = function(switchableId) {
        let switchable = game.getById(switchableId);
        switchable.active = !switchable.active;
    }

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.active !== undefined && e.active === false)) {
                intents.push({
                    representation: [game.word("turn on"), entity],
                    sequence: [createNewLineAction(`You turn on the ${entity.baseName}`),
                        {
                            func: "switchActive",
                            args: [entity.id]
                        }
                    ]
                });
            }
            return intents;
        }
    });


    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.active !== undefined && e.active === true)) {
                intents.push({
                    representation: [game.word("turn off"), entity],
                    sequence: [createNewLineAction(`You turn off the ${entity.baseName}`),
                        {
                            func: "switchActive",
                            args: [entity.id]
                        }
                    ]
                });
            }
            return intents;
        }
    });


    game.actions.tryUnlock = function(chestId, trialPassword) {
        let chest = game.getById(chestId);
        if (trialPassword === chest.lockedContainer.password) {
            chest.locked = false;
            newLine("The locks click open.")
        } else {
            newLine("Incorrect password.")
        }
    }

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let chest of game.entities.filter(e => e.lockedContainer && e.locked && game.isAccessible(e))) {
                for (let i0 = 0; i0 < 10; i0++) {
                    for (let i1 = 0; i1 < 10; i1++) {
                        for (let i2 = 0; i2 < 10; i2++) {
                            // the sequence
                            intents.push({
                                representation: [game.word(`unlock`), chest, game.word(String(i0)), game.word(String(i1)), game.word(String(i2))],
                                sequence: [{
                                    func: "tryUnlock",
                                    args: [chest.id, `${i0}${i1}${i2}`]
                                }],
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
                    sequence: [
                        createNewLineAction("You read the note..."),
                        createNewLineAction(`${entity.note.content}`)
                    ]
                })
            }
            return intents;
        }
    });


    game.actions.tryOpen = function(entityId) {
        let entity = game.getById(entityId);
        if (entity.locked) {
            newLine(`The ${entity.baseName} seems to be locked...`)
        } else {
            entity.closed = false;
            newLine(`You open the ${entity.baseName}`);
            newLine(`It contains: ${game.getChildren(entity).map(e => e.baseName).join(",")}`);
        }
    }
    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.closed && game.isAccessible(e))) {
                intents.push({
                    representation: [game.word(`open`), entity],
                    sequence: [{
                        func: "tryOpen",
                        args: [entity.id]
                    }],
                })
            }
            return intents;
        }
    });


    game.actions.punch = function(attackerId, targetId) {
        let attacker = game.getById(attackerId);
        let target = game.getById(targetId);
        let sounds = ["POW!", "Bam!", "Boom!", "Zock!"];
        newLine(`You punch the ${target.baseName}! ${sounds[Math.floor(Math.random() * sounds.length)]}`);
        if (target.health < 5) {
            newLine(`Some fluff flies out of the ruptures. 1 damage!`);
            target.health -= 1;
            game.emitSignal({ type: "damageDealt", by: attacker, to: target });
        }
    }

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.health > 0)) {
                intents.push({
                    representation: [game.word("attack"), entity, game.word("with fists")],
                    sequence: [createWaitAction(5),
                        {
                            func: "punch",
                            args: [player.id, entity.id]
                        },
                        createWaitAction(2),
                        {
                            func: "punch",
                            args: [player.id, entity.id]
                        },
                        createWaitAction(2),
                        {
                            func: "punch",
                            args: [player.id, entity.id]
                        },
                        createWaitAction(2)
                    ]
                })
            }
            return intents;
        }
    })

    game.actions.readyClaws = function(targetId) {
        let target = game.getById(targetId);
        if (target.health === 5)
            newLine(`You let out a piercing shriek as you ready your razor-sharp, glassy claws!`);
        else
            newLine(`You ready your claws again!`);
    }

    game.actions.claw = function(attackerId, targetId) {
        let attacker = game.getById(attackerId);
        let target = game.getById(targetId);
        newLine(`You tear out the ${target.baseName}'s insides for 2 damage!`);
        target.health -= 2;
        game.emitSignal({ type: "damageDealt", by: player, to: target, amount: 2 });
    }


    player.addPattern({
        intents: function() {
            let intents = [];
            for (let target of game.entities.filter(e => e.health > 0)) {
                intents.push({
                    representation: [game.word("attack"), target, game.word("with claws")],
                    sequence: [
                        { func: "readyClaws", args: [target.id] },
                        createWaitAction(10),
                        { func: "claw", args: [player.id, target.id] },
                    ]
                })
            }
            return intents;
        }
    })
}

module.exports = { loadMod }
},{"./timing":6,"./utils":7}],6:[function(require,module,exports){
module.exports = {
    tps: 6,
    mpt: 50
}
},{}],7:[function(require,module,exports){
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

module.exports = { setParent, unsetParent, newLine };
},{}]},{},[4]);
