class Core {
    constructor() {
        this.id = 0;
        this.entities = [];
    }

    addEntity(entity, parentEntity = null) {
        this.entities.push(entity);
        entity.id = this.id++;
        entity.parent = (parentEntity === null) ? null : parentEntity.id;
    }

    getById(id) {
        let found = false;
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].id === id) {
                found = this.entities[i];
            }
        }
        if (found === false) throw `object not found with id ${id}`;
        return found;
    }

    childrenOf(entity) {
        let contents = this.entities.filter(e => isParent(entity, e));
        // if (contents.length > 0) console.log(contents)
        console.log("children of", entity.text, contents)
        return contents;
    }

    deleteById(id) {
        // TODO? throw if not found
        this.entities = this.entities.filter(e => e.id !== id);
    }
}

function isParent(parentEntity, child) {
    return child.parent === parentEntity.id;
}

function setParent(parentEntity, child) {
    child.parent = parentEntity.id;
}

function unsetParent(parentEntity, child) {
    child.parent = null;
}

function check(obj, prop, val) {
    return obj[prop] !== undefined && obj[prop] == val;
}

////////////////// Main
////////////////// Player

class Player {
    constructor(core) {
        this.core = core;
        this.intent = undefined;
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
                    // console.log(action.representation[i].text, "invalid")
                    valid = false;
                } else {
                    // console.log(action.representation[i].text, "valid")
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
        console.log(validActions)
        console.log(`${validActions.length} valid commands at command.length ${player.command.length}`)
        for (let action of validActions) {
            // console.log(`studying ${action.representation.map(e => e.text)}`);
            // console.log(action);
            // if the action is the same length as the command, it can be setIntentd
            if (action.representation.length == player.command.length) {
                options.push({ text: "setIntent" })
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


    //^ command, updateCommandUI()
    pickNextWord(optionI) {
        let options = this.getNextWords();
        // console.log(`picked ${options[optionI].text}`);
        this.command.push(options[optionI]);

        updateCommandUI(this);
    }


    //^ getValidActions(), player, clearCommand()
    // set intent and clear the command
    setIntent() {
        // get valid actions
        let actions = this.getValidActions();
        if (actions.length !== 1) {
            throw "EXECUTION ERROR, NOT ONE VALID ACTION"
        }
        let action = actions[0];
        console.log(`executing ${action.representation.map(e => e.text)}`);

        // set intent, not picking
        this.intent = action;
        this.picking = false;

        // set windup and winddown
        if (action.windup !== undefined && action.windup > 0) {
            this.windup = action.windup;
        } else {
            this.windup = 0;
        }
        if (action.winddown !== undefined && action.winddown > 0) {
            this.winddown = action.winddown;
        } else {
            this.winddown = 0;
        }

        // clear command
        this.command = [];
        updateCommandUI(this);
    }
}

let core = new Core()
let player = new Player(core)


//^ command, document
function updateCommandUI(player) {
    document.getElementById("command").innerHTML = ">" + player.command.map(e => e.text).join(" ");
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
        let optionText = options[i].text;
        // create a span with the optionText text
        var node = document.createElement("a");
        node.className = "choice";
        node.innerText = optionText;
        document.getElementById('options').appendChild(node);
        // when the span is clicked, handle using that optionText
        if (optionText === "setIntent") {
            node.addEventListener("click", () => {
                player.setIntent();
                setOptions(player);
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
        });
    }
}


player.addPattern({
    verb: { text: "fill" },
    w_from: { text: "from" },
    actions: function() {
        let actions = [];
        for (let fluidSource of core.entities.filter(e => e.fluidSource)) {
            for (let container of core.entities.filter(e => e.fluidContainer)) {
                // check the container is empty, no fluids in container
                let fluidsInContainer = core.entities.filter(e => e.fluid && isParent(container, e));
                console.log("fluids", fluidsInContainer);
                if (fluidsInContainer.length === 0)
                    actions.push({
                        representation: [this.verb, container, this.w_from, fluidSource],
                        windup: 0,
                        winddown: 0,
                        // condition: function() {
                        //     return core.getById(fluidSource.id) && core.getById(container.id);
                        // },
                        effect: function() {
                            let fluid = { text: fluidSource.fluid, fluid: true, temperature: fluidSource.temperature }
                            newLine(`You fill up the ${container.text} from the ${fluidSource.text} with ${fluid.text}`)
                            core.addEntity(fluid);
                            setParent(container, fluid);
                        }
                    });
                // throw "HALT"
            }
        }
        return actions;
    }
});

player.addPattern({
    verb: { text: "empty" },
    actions: function() {
        let actions = [];
        for (let container of core.entities.filter(e => e.fluidContainer)) {
            if (core.childrenOf(container).length !== 0) {
                actions.push({
                    representation: [this.verb, container],
                    windup: 1,
                    winddown: 1,
                    condition: function() {},
                    effect: function() {
                        newLine(`You empty the ${container.text}.`);
                        for (let entity of core.entities) {
                            if (isParent(container, entity)) {
                                console.log("deleting", entity);
                                console.log("all entities")
                                console.log(core.entities);
                                core.deleteById(entity.id);
                            }
                        }
                    }
                });
            }
        }
        return actions;
    }
});

player.addPattern({
    verb: { text: "pour" },
    w_into: { text: "into" },
    actions: function() {
        let actions = [];
        let nonemptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length !== 0)))
        let emptyContainer = (e => (e.fluidContainer && (core.childrenOf(e).length === 0)))
        for (let sourceContainer of core.entities.filter(nonemptyContainer)) {
            for (let destinationContainer of core.entities.filter(emptyContainer)) {
                actions.push({
                    representation: [this.verb, sourceContainer, this.w_into, destinationContainer],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        for (let entity of core.entities) {
                            if (isParent(sourceContainer, entity)) {
                                newLine(`You pour the ${entity.text} from the ${sourceContainer.text} into the ${destinationContainer.text}.`);
                                unsetParent(sourceContainer, entity);
                                setParent(destinationContainer, entity);
                            }
                        }
                    }
                });
            }
        }
        return actions;
    }
});

player.addPattern({
    verb: { text: "put" },
    w_on: { text: "on" },
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.item)) {
            for (let surface of core.entities.filter(e => e.surface)) {
                actions.push({
                    representation: [this.verb, entity, this.w_on, surface],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        newLine(`You put the ${entity.text} on the ${surface.text}`);
                        entity.on = surface.id;
                        console.log(entity);
                    }
                });
            }
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    verb: { text: "generic" },
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => false)) {
            actions.push({
                representation: [this.verb, entity],
                windup: 0,
                winddown: 0,
                condition: function() {},
                effect: function() {}
            });
        }
        // return [];
        return actions;
    }
});


player.addPattern({
    verb: { text: "infuse" },
    w_in: { text: "in" },
    actions: function() {
        let actions = [];
        for (let infusable of core.entities.filter(e => e.infusable)) {
            for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
                actions.push({
                    representation: [this.verb, infusable, this.w_in, fluidContainer],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        newLine(`You put the ${infusable.text} in the ${fluidContainer.text} for infusing`);
                        setParent(fluidContainer, infusable);
                    }
                });
            }
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    verb: { text: "turn on" },
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.active !== undefined && e.active === false)) {
            actions.push({
                representation: [this.verb, entity],
                windup: 0,
                winddown: 0,
                condition: function() {},
                effect: function() {
                    entity.active = true;
                    newLine(`You turn on the ${entity.text}`)
                },
            });
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    verb: { text: "turn off" },
    actions: function() {
        let actions = [];
        for (let entity of core.entities.filter(e => e.active !== undefined && e.active === true)) {
            actions.push({
                representation: [this.verb, entity],
                windup: 0,
                winddown: 0,
                condition: function() {},
                effect: function() {
                    entity.active = false;
                    newLine(`You turn off the ${entity.text}`)
                },
            });
        }
        // return [];
        return actions;
    }
});

player.addPattern({
    verb: { text: "wait" },
    durations: [{ text: "a bit", dur: 1 }, { text: "a while", dur: 5 }, { text: "a long time", dur: 9 }],
    actions: function() {
        let actions = [];
        for (let duration of this.durations) {
            actions.push({
                representation: [this.verb, duration],
                windup: 0,
                winddown: duration.dur,
                condition: function() {},
                effect: function() {
                    newLine(`You wait ${duration.text}`)
                }
            });
        }
        // return [];
        return actions;
    }
});


player.addPattern({
    verb: { text: "take" },
    w_tea: { text: "mint teabag" },
    actions: function() {
        let actions = [];
        // let flavours = ["mint", "chamomile", "cranberry"];
        // for (let flavour of flavours) {
        // let teabag = { text: `${flavour} teabag`, item: true, flammable: true, infusable: true, flavour: flavour };
        actions.push({
            representation: [this.verb, this.w_tea],
            windup: 0,
            winddown: 0,
            condition: function() {},
            effect: function() {
                core.addEntity({ text: `mint teabag`, item: true, flammable: true, infusable: true, flavour: "mint" });
                newLine(`You grab a mint teabag.`);
            }
        });
        // }
        // return [];
        return actions;
    }
});

class Area {
    constructor() {
        this.text = "prototype area";
    }
}

class Teapot {
    constructor() {
        this.text = "teapot";
        this.fluidContainer = true;
        this.item = true;
    }
}

class Knife {
    constructor() {
        this.text = "knife";
        this.sharp = 3;
        this.item = true;
    }
}
// core.addEntity({ text: "rose", inv: false, weight: 1, smell: "sweet" })
// core.addEntity({ text: "rose", inv: true, weight: 2, smell: "sugary" })
// core.addEntity({ text: "daisy", inv: false, weight: 1, smell: "daisylike" })
// core.addEntity({ text: "shrine", shrine: true })
// core.addEntity({ text: "crystal", inv: false, weight: 1 })
// core.addEntity({ text: "boulder", weight: 10 })
let area = new Area()
core.addEntity({ text: "faucet", fluidSource: true, fluid: "water", temperature: 20 });
core.addEntity(new Teapot());
core.addEntity({ text: "cup", fluidContainer: true, item: true });
core.addEntity({ text: "table", surface: true });
core.addEntity({ text: "stove", active: false, surface: true, heatSource: true });
core.addEntity(area);

let k = new Knife();

let stoveBehaviour = {
    ctr: 0,
    onTick: function() {
        this.ctr++;
        for (let stove of core.entities.filter(e => e.text === "stove")) {
            if (stove.active) {
                if (this.ctr >= 10) {
                    this.ctr = 0;
                    newLine("The stove's flame burns a warm orange.")
                }
                for (let entityOnStove of core.entities.filter(e => (e.on === stove.id))) {
                    newLine(`The stove heats up the ${entityOnStove.text}`)
                    if (entityOnStove.fluidContainer) {
                        for (let fluid of core.entities.filter(e => (e.fluid && isParent(entityOnStove, e)))) {
                            newLine(`The stove heats up the ${fluid.text} in the ${entityOnStove.text}`);
                            fluid.temperature += 1;
                            if (fluid.temperature > 23) {
                                newLine(`The ${entityOnStove.text} is filled with hot ${fluid.text}!`)
                            }
                        }
                    }
                    if (entityOnStove.flammable) {
                        newLine(`The ${entityOnStove.text} burns up`)
                        core.deleteById(entityOnStove.id);
                    }
                }
            }
        }
    }
}

let teaBehaviour = {
    onTick: function() {
        for (let fluidContainer of core.entities.filter(e => e.fluidContainer)) {
            for (let fluid of core.entities.filter(e => (e.fluid && e.in === fluidContainer.id && e.temperature > 23))) {
                // hot fluid
                if (core.entities.filter(e => (e.infusable && e.in === fluidContainer.id)).length > 0) {
                    newLine(`Congratulations! You have made tea!`)
                }
            }
        }
    }
}


updateCommandUI(player);

core.addEntity(player);


let time = 0;
// setOptions();

function tick() {
    // player: no intent
    if (player.intent === undefined) {
        // player: no intent, winddown --> reduce
        if (player.winddown > 0) {
            player.winddown -= 1;
            return true;
        }
        // player: no intent, no winddown --> pick
        else {
            if (player.picking === false) {
                setOptions(player);
                player.picking = true;
            }
            return false;
        }
    }
    // player: intent
    else {
        // player: intent, windup --> reduce
        if (player.windup > 0) {
            player.windup -= 1;
            return true;
        }
        // player: intent, no windup --> effect
        else {
            // take effect
            player.intent.effect();
            player.intent = undefined;
            return false;
        }
    }
}


function gameLoop() {
    console.log(core.entities);
    setInterval(() => {
        if (tick()) {
            // newLine(`tick ${time} ends`);
            stoveBehaviour.onTick();
            teaBehaviour.onTick();
            time++;
            // newLine(`tick ${time} begins`);
        }
    }, 300)
}
gameLoop();
// console.log('player.command:', player.command)
// console.log('options:', getNextWords())

// pickNextWord(0)
// console.log('player.command:', player.command)
// console.log('options:', getNextWords())

// pickNextWord(2)
// console.log('player.command:', player.command)
// console.log('options:', getNextWords())

// pickNextWord(0)
// console.log('player.command:', player.command)
// console.log('options:', getNextWords())

// setIntent();


function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}