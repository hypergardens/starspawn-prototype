import * as utils from "./utils"
import * as timing from "./timing"

let newLine = utils.newLine;
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
        let fluid = { baseName: fluidSource.fluidSource, fluid: true, temperature: fluidSource.temperature }
        newLine(`You fill up the ${fluidContainer.baseName} from the ${fluidSource.baseName} with ${fluid.baseName}`)
        game.addEntity(fluid);
        game.setParent(fluidContainer, fluid);
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
        let containerParent = game.getParent(container);
        newLine(`You empty the ${container.baseName} on the ${containerParent.baseName}.`);
        for (let child of game.getChildrenById(containerId)) {
            if (child.fluid) {
                game.deleteById(child.id)
            } else {
                game.setParent(containerParent, child)
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
            game.setParent(destination, child);
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


    game.actions.setParentById = (parentId, childId, rel) => game.setParentById(parentId, childId, rel);

    player.addPattern({
        intents: function() {
            let intents = [];
            for (let entity of game.entities.filter(e => e.item && game.isAccessible(e))) {
                for (let surface of game.entities.filter(e => e.surface)) {
                    intents.push({
                        representation: [game.word("put"), entity, game.word("on"), surface],
                        sequence: [createNewLineAction(`You put the ${entity.baseName} on the ${surface.baseName}`), {
                            func: "setParentById",
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
                                func: "setParentById",
                                args: [fluidContainer.id, infusable.id, "in"]
                            },
                            createWaitAction(3)
                        ]
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
                    // for (let i1 = 0; i1 < 10; i1++) {
                    // for (let i2 = 0; i2 < 10; i2++) {
                    // the sequence
                    intents.push({
                        representation: [game.word(`unlock`), chest, game.word(String(i0))],
                        // representation: [game.word(`unlock`), chest, game.word(String(i0)), game.word(String(i1)), game.word(String(i2))],
                        sequence: [{
                            func: "tryUnlock",
                            args: [chest.id, `${i0}`]
                                // args: [chest.id, `${i0}${i1}${i2}`]
                        }],
                    });
                    // }
                    // }
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

    game.actions.sipFrom = function(containerId) {
        let container = game.getById(containerId);
        for (let fluid of game.getChildren(container).filter(e => e.fluid)) {
            if (fluid.turboTea) {
                newLine(`You feel like a 400 IQ, cupboard-opening, killing machine! In fact, you feel so good you feel like giving Gardens some feedback on their game!`);
            } else if (fluid.tea) {
                newLine(`It's not too bad. It's... fine.`)
            } else {
                newLine(`It's important to stay hydrated, I guess.`)
            }
        }
    }


    player.addPattern({
        intents: function() {
            let intents = [];
            for (let nonEmptyFluidContainer of game.entities.filter(e => fluidsIn(e))) {
                intents.push({
                    representation: [game.word("sip from"), nonEmptyFluidContainer],
                    sequence: [
                        createNewLineAction(`You sip from the ${nonEmptyFluidContainer.baseName}.`),
                        createWaitAction(20),
                        {
                            func: "sipFrom",
                            args: [nonEmptyFluidContainer.id]
                        }
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


    game.receivers.push({
        on_damageDealt: function(data) {
            newLine(`Damage dealt by ${data.by.baseName}`);
            if (data.to.health <= 0 && !data.to.dead) {
                data.to.dead = true;
                newLine(`You have defeated your first enemy, a vile ${data.to.baseName}. It drops a teabag!`);
                data.to.baseName = `dead ${data.to.baseName}`;
                data.health = undefined;
                game.addEntity({ baseName: `VICTORIOUS teabag`, item: true, flammable: true, infusable: true, flavour: "VICTORY" }, game.getParent(data.to));
            }
        }
    })

    game.receivers.push({
        on_tick: function(data) {
            for (let stove of game.entities.filter(e => e.baseName === "stove")) {
                if (stove.active) {
                    stove.ctr += 1;
                    // put out a message regularly
                    if (stove.ctr >= 20) {
                        stove.ctr = 0;
                        newLine("The stove's flame burns a warm orange.")
                    }
                    // heat up fluid inside containers on stove
                    for (let containerOnStove of game.entities.filter(containerOnStove => containerOnStove.fluidContainer && game.isParent(stove, containerOnStove))) {
                        // newLine(`The stove heats up the ${containerOnStove.baseName}`)
                        for (let fluid of game.entities.filter(fluid => (fluid.fluid && game.isParent(containerOnStove, fluid)))) {
                            // newLine(`The stove heats up the ${fluid.baseName} in the ${containerOnStove.baseName}`);
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                newLine(`The ${containerOnStove.baseName} is filled with hot ${fluid.baseName}!`)
                            }
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
                    for (let infusingTeabag of game.entities.filter(e => (
                            e.infusable &&
                            game.isParent(fluidContainer, e)))) {
                        count += 1;
                        prefix += `${infusingTeabag.flavour} `
                        game.emitSignal({ type: "teaMade" });
                        if (count < 3) {
                            hotFluid.baseName = `${prefix} tea`;
                            hotFluid.tea = true;
                        } else {
                            hotFluid.baseName = `TURBO TESTER TEA`;
                            if (!hotFluid.turboTea) {
                                hotFluid.turboTea = true;
                                newLine("TOTAL VICTORY ACHIEVED! Enjoy your tea!");
                            }
                        }
                        // console.log("hotFluid", hotFluid);
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

}

module.exports = { loadMod }