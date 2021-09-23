let id = 0
let things = []

function addThing() {
    for (let thing of arguments) {
        thing.id = id++;
        things.push(thing)
    }
}

function getById(id) {
    let found = false;
    for (let i = 0; i < things.length; i++) {
        if (things[i].id === id) {
            found = things[i];
        }
    }
    if (found === false) throw `object not found with id ${id}`;
    return found;
}


function deleteThing(thing) {
    things = things.filter(e => e !== thing);
}

function deleteThingById(delId) {
    deleteThing(getById(delId))
}

function check(obj, prop, val) {
    return obj[prop] !== undefined && obj[prop] == val;
}

function getValidActions() {
    let validActions = [];
    for (let action of getActions()) {
        let valid = true;
        for (let i = 0; i < command.length; i++) {
            if (action.representation[i] !== command[i]) {
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

function getOptions() {
    let options = [];
    let validActions = getValidActions();
    console.log(`${validActions.length} valid commands at command.length ${command.length}`)
    for (let action of validActions) {
        // console.log(`studying ${action.representation.map(e => e.text)}`);
        // console.log(action);
        // if the action is the same length as the command, it can be executed
        if (action.representation.length == command.length) {
            options.push({ text: "execute" })
        } else {
            let newOption = action.representation[command.length];
            let duplicateThing = false;

            // let duplicateVerb = false;
            // TODO: clean up and make more explicit
            // TODO: see if it can be replaced completely
            // if (command.length === 0 && options.length > 0) {
            //     for (let option of options) {
            //         if (option.text === newOption.text) {
            //             duplicateVerb = true;
            //         }
            //     }
            // }

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
    return options;
}

function updateCommandUI() {
    document.getElementById("command").innerHTML = ">" + command.map(e => e.text).join(" ");
}

function pickOption(optionI) {
    let options = getOptions();
    console.log(`picked ${options[optionI].text}`)
    command.push(options[optionI]);
    updateCommandUI();
}

function execute() {
    let actions = getValidActions();
    if (actions.length !== 1) {
        throw "EXECUTION ERROR, NOT ONE VALID ACTION"
    }
    let action = actions[0];
    console.log(`executing ${action.representation.map(e => e.text)}`);

    // set intent, not picking
    player.intent = action;
    player.picking = false;
    // set windup and winddown
    if (action.windup !== undefined && action.windup > 0) {
        player.windup = action.windup;
    } else {
        player.windup = 0;
    }
    if (action.winddown !== undefined && action.winddown > 0) {
        player.winddown = action.winddown;
    } else {
        player.winddown = 0;
    }
    clearCommand();
}

function clearCommand() {
    command = [];
    updateCommandUI();
}

function clearOptions() {
    document.getElementById('options').innerHTML = "";
}

function setOptions() {
    document.getElementById('options').innerHTML = "";
    // coupling with player, no options of windup or down
    if (player.windup > 0 || player.winddown > 0) return;
    let options = getOptions();
    for (let i = 0; i < options.length; i++) {
        let optionText = options[i].text;
        // create a span with the optionText text
        var node = document.createElement("a");
        node.className = "choice";
        node.innerText = optionText;
        document.getElementById('options').appendChild(node);
        // when the span is clicked, handle using that optionText
        if (optionText === "execute") {
            node.addEventListener("click", () => {
                execute();
                setOptions();
            });
        } else {
            node.addEventListener("click", () => {
                pickOption(i);
                setOptions();
            });
        }
    }
    if (command.length > 0) {
        let cancelNode = document.createElement("a");
        cancelNode.className = "cancel";
        cancelNode.innerText = "cancel";
        document.getElementById('options').appendChild(cancelNode);
        cancelNode.addEventListener("click", () => {
            clearCommand();
            setOptions();
        });
    }
}

function getActions() {
    let actions = []
    for (let pattern of patterns) {
        for (let action of pattern.actions()) {
            actions.push(action)
        }
    }
    return actions
}

let command = [];
let patterns = [];

patterns.push({
    verb: { text: "fill" },
    w_from: { text: "from" },
    actions: function() {
        let actions = [];
        for (let fluidSource of things.filter(e => e.fluidSource)) {
            for (let container of things.filter(e => e.fluidContainer)) {
                // check the container is empty, no fluids in container
                if (things.filter(e => e.fluid && e.in === container.id).length === 0)
                    actions.push({
                        representation: [this.verb, container, this.w_from, fluidSource],
                        windup: 0,
                        winddown: 0,
                        condition: function() {
                            return getById(fluidSource.id) && getById(container.id);
                        },
                        effect: function() {
                            let fluid = { text: fluidSource.fluid, fluid: true, in: container.id, temperature: fluidSource.temperature }
                            newLine(`You fill up the ${container.text} from the ${fluidSource.text} with ${fluid.text}`)
                            addThing(fluid);
                        }
                    });
            }
        }
        return actions;
    }
});

patterns.push({
    verb: { text: "empty" },
    actions: function() {
        let actions = [];
        for (let container of things.filter(e => e.fluidContainer)) {
            if (thingsInId(container.id).length !== 0) {
                actions.push({
                    representation: [this.verb, container],
                    windup: 1,
                    winddown: 1,
                    condition: function() {},
                    effect: function() {
                        newLine(`You empty the ${container.text}.`);
                        for (let thing of things) {
                            if (thing.in === container.id) {
                                deleteThingById(thing.id);
                            }
                        }
                    }
                });
            }
        }
        return actions;
    }
});

patterns.push({
    verb: { text: "pour" },
    w_into: { text: "into" },
    actions: function() {
        let actions = [];
        let nonemptyContainer = (e => (e.fluidContainer && (thingsInId(e.id).length !== 0)))
        let emptyContainer = (e => (e.fluidContainer && (thingsInId(e.id).length === 0)))
        for (let sourceContainer of things.filter(nonemptyContainer)) {
            for (let destinationContainer of things.filter(emptyContainer)) {
                actions.push({
                    representation: [this.verb, sourceContainer, this.w_into, destinationContainer],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        for (let thing of things) {
                            if (thing.in === sourceContainer.id) {
                                newLine(`You pour the ${thing.text} from the ${sourceContainer.text} into the ${destinationContainer.text}.`);
                                thing.in = destinationContainer.id;
                            }
                        }
                    }
                });
            }
        }
        return actions;
    }
});

function thingsInId(id) {
    let contents = things.filter(e => (e.in !== undefined && e.in === id))
    console.log(contents)
    return contents;
}

patterns.push({
    verb: { text: "put" },
    w_on: { text: "on" },
    actions: function() {
        let actions = [];
        for (let thing of things.filter(e => e.item)) {
            for (let surface of things.filter(e => e.surface)) {
                actions.push({
                    representation: [this.verb, thing, this.w_on, surface],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        newLine(`You put the ${thing.text} on the ${surface.text}`);
                        thing.on = surface.id;
                        console.log(thing);
                    }
                });
            }
        }
        // return [];
        return actions;
    }
});

patterns.push({
    verb: { text: "generic" },
    actions: function() {
        let actions = [];
        for (let thing of things.filter(e => false)) {
            actions.push({
                representation: [this.verb, thing],
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


patterns.push({
    verb: { text: "infuse" },
    w_in: { text: "in" },
    actions: function() {
        let actions = [];
        for (let infusable of things.filter(e => e.infusable)) {
            for (let fluidContainer of things.filter(e => e.fluidContainer)) {
                actions.push({
                    representation: [this.verb, infusable, this.w_in, fluidContainer],
                    windup: 0,
                    winddown: 0,
                    condition: function() {},
                    effect: function() {
                        newLine(`You put the ${infusable.text} in the ${fluidContainer.text} for infusing`);
                        infusable.in = fluidContainer.id;
                    }
                });
            }
        }
        // return [];
        return actions;
    }
});

patterns.push({
    verb: { text: "turn on" },
    actions: function() {
        let actions = [];
        for (let thing of things.filter(e => e.active !== undefined && e.active === false)) {
            actions.push({
                representation: [this.verb, thing],
                windup: 0,
                winddown: 0,
                condition: function() {},
                effect: function() {
                    thing.active = true;
                    newLine(`You turn on the ${thing.text}`)
                },
            });
        }
        // return [];
        return actions;
    }
});

patterns.push({
    verb: { text: "turn off" },
    actions: function() {
        let actions = [];
        for (let thing of things.filter(e => e.active !== undefined && e.active === true)) {
            actions.push({
                representation: [this.verb, thing],
                windup: 0,
                winddown: 0,
                condition: function() {},
                effect: function() {
                    thing.active = false;
                    newLine(`You turn off the ${thing.text}`)
                },
            });
        }
        // return [];
        return actions;
    }
});

patterns.push({
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


patterns.push({
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
                addThing({ text: `mint teabag`, item: true, flammable: true, infusable: true, flavour: "mint" });
                newLine(`You grab a mint teabag.`);
            }
        });
        // }
        // return [];
        return actions;
    }
});

// addThing({ text: "rose", inv: false, weight: 1, smell: "sweet" })
// addThing({ text: "rose", inv: true, weight: 2, smell: "sugary" })
// addThing({ text: "daisy", inv: false, weight: 1, smell: "daisylike" })
// addThing({ text: "shrine", shrine: true })
// addThing({ text: "crystal", inv: false, weight: 1 })
// addThing({ text: "boulder", weight: 10 })
addThing({ text: "faucet", fluidSource: true, fluid: "water", temperature: 20 });
addThing({ text: "teapot", fluidContainer: true, item: true });
addThing({ text: "cup", fluidContainer: true, item: true });
addThing({ text: "table", surface: true });
addThing({ text: "stove", active: false, surface: true, heatSource: true });

let stoveBehaviour = {
    ctr: 0,
    onTick: function() {
        this.ctr++;
        for (let stove of things.filter(e => e.text === "stove")) {
            if (stove.active) {
                if (this.ctr >= 10) {
                    this.ctr = 0;
                    newLine("The stove's flame burns a warm orange.")
                }
                for (let thingOnStove of things.filter(e => (e.on === stove.id))) {
                    newLine(`The stove heats up the ${thingOnStove.text}`)
                    if (thingOnStove.fluidContainer) {
                        for (let fluid of things.filter(e => (e.fluid && e.in == thingOnStove.id))) {
                            newLine(`The stove heats up the ${fluid.text} in the ${thingOnStove.text}`);
                            fluid.temperature += 1;
                            if (fluid.temperature > 23) {
                                newLine(`The ${thingOnStove.text} is filled with hot ${fluid.text}!`)
                            }
                        }
                    }
                    if (thingOnStove.flammable) {
                        newLine(`The ${thingOnStove.text} burns up`)
                        deleteThing(thingOnStove);
                    }
                }
            }
        }
    }
}

let teaBehavour = {
    onTick: function() {
        for (let fluidContainer of things.filter(e => e.fluidContainer)) {
            for (let fluid of things.filter(e => (e.fluid && e.in === fluidContainer.id && e.temperature > 23))) {
                // hot fluid
                if (things.filter(e => (e.infusable && e.in === fluidContainer.id)).length > 0) {
                    newLine(`Congratulations! You have made tea!`)
                }
            }
        }
    }
}

let player = {
    intent: undefined,
    windup: 0,
    winddown: 0,
    picking: false,
}

updateCommandUI();

addThing(player);


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
                setOptions();
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
    setInterval(() => {
        if (tick()) {
            // newLine(`tick ${time} ends`);
            stoveBehaviour.onTick();
            teaBehavour.onTick();
            time++;
            // newLine(`tick ${time} begins`);
        }
    }, 300)
}
gameLoop();
// console.log('command:', command)
// console.log('options:', getOptions())

// pickOption(0)
// console.log('command:', command)
// console.log('options:', getOptions())

// pickOption(2)
// console.log('command:', command)
// console.log('options:', getOptions())

// pickOption(0)
// console.log('command:', command)
// console.log('options:', getOptions())

// execute();


function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}