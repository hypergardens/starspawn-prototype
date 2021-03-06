import * as timing from "./timing";
import * as GameModule from "./GameModule";

import { Entity, Action } from "./Interfaces";
import { Player } from "./PlayerModule";

export function loadMod(game: GameModule.Game) {
    let player = game.entities.filter((e) => e.player)[0] as Player;

    game.actions.newLine = (...args) => game.newLine.call(game, ...args);
    // let newLine = game.newLine;

    game.actions.wait = function (ticks: number = 0) {
        // game.newLine(`Still waiting... of ${ticks}`);
    };

    function createNewLineAction(text: string): Action {
        return {
            func: "newLine",
            args: [text],
        };
    }

    function createWaitAction(
        ticks: number,
        processText: string = "Waiting..."
    ): Action {
        return {
            func: "wait",
            args: [ticks],
            duration: ticks,
            pause: timing.mpt / Math.pow(ticks, 1),
            processText: processText,
        };
    }

    // wait various durations
    player.patterns.push({
        intents: () => {
            let intents = [];
            let durations = [
                { name: "1 tick", dur: 1 },
                { name: "3 ticks", dur: 3 },
                { name: "6 ticks", dur: 6 },
                { name: "12 ticks", dur: 12 },
                { name: "60 ticks", dur: 60 },
            ];
            for (let duration of durations) {
                let intent = {
                    representation: [
                        game.word("wait"),
                        game.word(duration.name),
                    ],
                    sequence: [
                        createNewLineAction(`You wait ${duration.dur} ticks.`),
                        createWaitAction(duration.dur),
                    ],
                };
                intents.push(intent);
            }
            return intents;
        },
    });

    game.actions.fillFrom = function (fluidSourceId, fluidContainerId) {
        let fluidSource = game.getById(fluidSourceId);
        let fluidContainer = game.getById(fluidContainerId);

        let fluid = game.addEntity(
            {
                name: fluidSource.fluidSource,
                fluid: true,
                temperature: 20,
            },
            fluidContainer
        );
        game.newLine(
            `You fill up the ${fluidContainer.name} from the ${fluidSource.name} with ${fluid.name}`
        );
    };

    function fluidsIn(fluidContainer) {
        let fluidChildren = game
            .getChildren(fluidContainer)
            .filter((e) => e.fluid);
        return fluidChildren.length > 0;
    }

    // fill container from fluidSource
    player.addPattern({
        intents: function () {
            let intents = [];
            for (let fluidSource of game.entities.filter(
                (e) => e.fluidSource
            )) {
                for (let nonEmptyFluidContainer of game.entities.filter(
                    (e) => e.fluidContainer && !fluidsIn(e)
                )) {
                    intents.push({
                        representation: [
                            game.word("fill"),
                            nonEmptyFluidContainer,
                            game.word("from"),
                            fluidSource,
                        ],
                        sequence: [
                            createWaitAction(3, "Filling"),
                            {
                                func: "fillFrom",
                                args: [
                                    fluidSource.id,
                                    nonEmptyFluidContainer.id,
                                ],
                                duration: 1,
                            },
                            createWaitAction(3, "Recovering"),
                        ],
                    });
                    // throw "HALT"
                }
            }
            return intents;
        },
    });

    game.actions.emptyContainer = function (containerId) {
        let container = game.getById(containerId);
        let containerParent = game.getParent(container);
        game.newLine(
            `You empty the ${container.name} on the ${containerParent.name}.`
        );
        for (let child of game.getChildrenById(containerId)) {
            if (child.fluid) {
                game.deleteById(child.id);
            } else {
                game.setParent(containerParent, child);
            }
        }
    };

    player.addPattern({
        // empty container
        intents: function () {
            let intents = [];
            // nonempty fluid containers
            for (let nonEmptyFluidContainer of game.entities.filter(
                (e) => e.fluidContainer && game.getChildren(e).length !== 0
            )) {
                intents.push({
                    representation: [
                        game.word("empty"),
                        nonEmptyFluidContainer,
                    ],
                    sequence: [
                        createWaitAction(1),
                        {
                            func: "emptyContainer",
                            args: [nonEmptyFluidContainer.id],
                        },
                        createWaitAction(1),
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.pourXintoY = function (sourceId, destinationId) {
        let source = game.getById(sourceId);
        let destination = game.getById(destinationId);

        for (let child of game.getChildren(source)) {
            game.newLine(
                `You pour the ${child.name} from the ${source.name} into the ${destination.name}.`
            );
            game.setParent(destination, child);
        }
    };

    player.addPattern({
        // pour X into Y
        intents: function () {
            let intents = [];
            let isNonEmptyFluidContainer = (e) =>
                e.fluidContainer && game.getChildren(e).length !== 0;
            let isEmptyContainer = (e) => e.fluidContainer && !fluidsIn(e);
            for (let sourceContainer of game.entities.filter(
                isNonEmptyFluidContainer
            )) {
                for (let destinationContainer of game.entities.filter(
                    isEmptyContainer
                )) {
                    intents.push({
                        representation: [
                            game.word("pour"),
                            sourceContainer,
                            game.word("into"),
                            destinationContainer,
                        ],
                        sequence: [
                            {
                                func: "pourXintoY",
                                args: [
                                    sourceContainer.id,
                                    destinationContainer.id,
                                ],
                            },
                        ],
                    });
                }
            }
            return intents;
        },
    });

    game.actions.setParentById = (parentId, childId, rel) =>
        game.setParentById(parentId, childId, rel);

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter(
                (e) => e.item && game.isAccessible(e)
            )) {
                for (let surface of game.entities.filter((e) => e.surface)) {
                    intents.push({
                        representation: [
                            game.word("put"),
                            entity,
                            game.word("on"),
                            surface,
                        ],
                        sequence: [
                            createNewLineAction(
                                `You put the ${entity.name} on the ${surface.name}`
                            ),
                            {
                                func: "setParentById",
                                args: [surface.id, entity.id, "on"],
                            },
                        ],
                    });
                }
            }
            return intents;
        },
    });

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let infusable of game.entities.filter(
                (e) => e.infusable && game.isAccessible(e)
            )) {
                for (let fluidContainer of game.entities.filter(
                    (e) => e.fluidContainer
                )) {
                    intents.push({
                        representation: [
                            game.word("put"),
                            infusable,
                            game.word("in"),
                            fluidContainer,
                        ],
                        sequence: [
                            {
                                func: "setParentById",
                                args: [fluidContainer.id, infusable.id, "in"],
                            },
                            createWaitAction(3),
                        ],
                    });
                }
            }
            return intents;
        },
    });

    game.actions.switchActive = function (switchableId) {
        let switchable = game.getById(switchableId);
        switchable.active = !switchable.active;
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter(
                (e) => e.active !== undefined && e.active === false
            )) {
                intents.push({
                    representation: [game.word("turn on"), entity],
                    sequence: [
                        createNewLineAction(`You turn on the ${entity.name}`),
                        {
                            func: "switchActive",
                            args: [entity.id],
                        },
                    ],
                });
            }
            return intents;
        },
    });

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter(
                (e) => e.active !== undefined && e.active === true
            )) {
                intents.push({
                    representation: [game.word("turn off"), entity],
                    sequence: [
                        createNewLineAction(`You turn off the ${entity.name}`),
                        {
                            func: "switchActive",
                            args: [entity.id],
                        },
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.tryUnlock = function (chestId, trialPassword) {
        let chest = game.getById(chestId);
        if (trialPassword === chest.locked.password) {
            chest.locked.isLocked = false;
            game.newLine("The locks click open.");
        } else {
            game.newLine("Incorrect password.");
        }
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let chest of game.entities.filter(
                (e: Entity) => e.locked && game.isAccessible(e)
            )) {
                for (let i0 = 0; i0 < 10; i0++) {
                    // for (let i1 = 0; i1 < 10; i1++) {
                    // for (let i2 = 0; i2 < 10; i2++) {
                    // the sequence
                    intents.push({
                        representation: [
                            game.word(`unlock`),
                            chest,
                            game.word(String(i0)),
                        ],
                        // representation: [game.word(`unlock`), chest, game.word(String(i0)), game.word(String(i1)), game.word(String(i2))],
                        sequence: [
                            {
                                func: "tryUnlock",
                                args: [chest.id, `${i0}`],
                                // args: [chest.id, `${i0}${i1}${i2}`]
                            },
                        ],
                    });
                    // }
                    // }
                }
            }
            return intents;
        },
    });

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter((e) => e.readable)) {
                // the sequence
                intents.push({
                    representation: [game.word(`read`), entity],
                    sequence: [
                        createNewLineAction("You read the note..."),
                        createNewLineAction(`${entity.readable.message}`),
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.tryOpen = function (entityId) {
        let entity = game.getById(entityId);
        if (entity.locked && entity.locked.isLocked) {
            game.newLine(`The ${entity.name} seems to be locked...`);
        } else if (entity.closed === true) {
            entity.closed = false;
            game.newLine(`You open the ${entity.name}`);
            game.newLine(
                `It contains: ${game
                    .getChildren(entity)
                    .map((e) => e.name)
                    .join(",")}`
            );
        }
    };
    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter(
                (e) => e.closed && game.isAccessible(e)
            )) {
                intents.push({
                    representation: [game.word(`open`), entity],
                    sequence: [
                        {
                            func: "tryOpen",
                            args: [entity.id],
                        },
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.punch = function (attackerId, targetId) {
        let attacker = game.getById(attackerId);
        let target = game.getById(targetId);
        let sounds = ["POW!", "Bam!", "Boom!", "Zock!"];
        game.newLine(
            `You punch the ${target.name}! ${
                sounds[Math.floor(Math.random() * sounds.length)]
            }`
        );
        if (target.health < 5) {
            game.newLine(`Some fluff flies out of the ruptures. 1 damage!`);
            target.health -= 1;
            game.queueEvent({
                type: "damageDealt",
                from: attacker,
                to: target,
            });
        }
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let entity of game.entities.filter((e) => e.health > 0)) {
                intents.push({
                    representation: [
                        game.word("attack"),
                        entity,
                        game.word("with fists"),
                    ],
                    sequence: [
                        createWaitAction(5),
                        {
                            func: "punch",
                            args: [player.id, entity.id],
                        },
                        createWaitAction(2),
                        {
                            func: "punch",
                            args: [player.id, entity.id],
                        },
                        createWaitAction(2),
                        {
                            func: "punch",
                            args: [player.id, entity.id],
                        },
                        createWaitAction(2),
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.sipFrom = function (containerId) {
        let container = game.getById(containerId);
        for (let fluid of game.getChildren(container).filter((e) => e.fluid)) {
            if (fluid.turboTea) {
                game.newLine(
                    `You feel like a 400 IQ, cupboard-opening, killing machine! In fact, you feel so good you feel like giving Gardens some feedback on their game!`
                );
            } else if (fluid.tea) {
                game.newLine(`It's not too bad. It's... fine.`);
            } else {
                game.newLine(`It's important to stay hydrated, I guess.`);
            }
        }
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let nonEmptyFluidContainer of game.entities.filter((e) =>
                fluidsIn(e)
            )) {
                intents.push({
                    representation: [
                        game.word("sip from"),
                        nonEmptyFluidContainer,
                    ],
                    sequence: [
                        createNewLineAction(
                            `You sip from the ${nonEmptyFluidContainer.name}.`
                        ),
                        createWaitAction(20),
                        {
                            func: "sipFrom",
                            args: [nonEmptyFluidContainer.id],
                        },
                    ],
                });
            }
            return intents;
        },
    });

    game.actions.readyClaws = function (targetId) {
        let target = game.getById(targetId);
        if (target.health === 5)
            game.newLine(
                `You let out a piercing shriek as you ready your razor-sharp, glassy claws!`
            );
        else game.newLine(`You ready your claws again!`);
    };

    game.actions.claw = function (attackerId, targetId) {
        let attacker = game.getById(attackerId);
        let target = game.getById(targetId);
        game.newLine(`You tear out the ${target.name}'s insides for 2 damage!`);
        target.health -= 2;
        game.queueEvent({
            type: "damageDealt",
            from: attacker,
            to: target,
            damage: 2,
        });
    };

    player.addPattern({
        intents: function () {
            let intents = [];
            for (let target of game.entities.filter((e) => e.health > 0)) {
                intents.push({
                    representation: [
                        game.word("attack"),
                        target,
                        game.word("with claws"),
                    ],
                    sequence: [
                        { func: "readyClaws", args: [target.id] },
                        createWaitAction(10),
                        { func: "claw", args: [player.id, target.id] },
                    ],
                });
            }
            return intents;
        },
    });

    game.addHandler(0, {
        name: "punching bag handler",
        on_damageDealt: function (data) {
            game.newLine(`Damage dealt by ${data.from.name}`);
            if (data.to.health <= 0 && !data.to.dead) {
                data.to.dead = true;
                game.newLine(
                    `You have defeated your first enemy, a vile ${data.to.name}. It drops a teabag!`
                );
                data.to.name = `dead ${data.to.name}`;
                data.health = undefined;
                game.addEntity(
                    {
                        name: `VICTORIOUS teabag`,
                        item: true,
                        infusable: {
                            flavour: "VICTORY",
                        },
                    },
                    game.getParent(data.to)
                );
            }
        },
    });

    game.addHandler(0, {
        name: "heat handler",
        on_tick: function (data) {
            for (let stove of game.entities.filter((e) => e.name === "stove")) {
                if (stove.active) {
                    stove.ctr += 1;
                    // put out a message regularly
                    if (stove.ctr >= 2) {
                        stove.ctr = 0;
                        game.newLine("The stove's flame burns a warm orange.");
                    }
                    // heat up fluid inside containers on stove
                    for (let containerOnStove of game.entities.filter(
                        (containerOnStove) =>
                            containerOnStove.fluidContainer &&
                            game.isParent(stove, containerOnStove)
                    )) {
                        // game.newLine(
                        //     `The stove heats up the ${containerOnStove.name}`
                        // );
                        for (let fluid of game.entities.filter(
                            (fluid) =>
                                fluid.fluid &&
                                game.isParent(containerOnStove, fluid)
                        )) {
                            // game.newLine(
                            //     `The stove heats up the ${fluid.name} in the ${containerOnStove.name}`
                            // );
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                game.newLine(
                                    `The ${containerOnStove.name} is filled with hot ${fluid.name}!`
                                );
                            }
                        }
                    }
                }
            }
        },
    });

    game.addHandler(900, {
        name: "tea handler",
        on_tick: function (data) {
            for (let fluidContainer of game.entities.filter(
                (e) => e.fluidContainer
            )) {
                for (let hotFluid of game.entities.filter(
                    (hotFluid) =>
                        hotFluid.fluid &&
                        game.isParent(fluidContainer, hotFluid) &&
                        hotFluid.temperature > 23
                )) {
                    let count = 0;
                    let prefix = "";
                    // if infusable in container and hot fluid
                    for (let infusingTeabag of game.entities.filter(
                        (e) => e.infusable && game.isParent(fluidContainer, e)
                    )) {
                        count += 1;
                        prefix += `${infusingTeabag.infusable.flavour} `;
                        game.queueEvent({ type: "teaMade" });
                        if (count < 3) {
                            hotFluid.name = `${prefix} tea`;
                            hotFluid.tea = true;
                        } else {
                            hotFluid.name = `TURBO TESTER TEA`;
                            if (!hotFluid.turboTea) {
                                hotFluid.turboTea = true;
                                game.newLine(
                                    "TOTAL VICTORY ACHIEVED! Enjoy your tea!"
                                );
                            }
                        }
                        // console.log("hotFluid", hotFluid);
                    }
                }
            }
        },
    });

    game.addEntity({
        name: "winBehaviourState",
        invisible: true,
        winBehaviorState: { won: false, uberWon: false },
    });

    game.addHandler(1000, {
        on_teaMade: function (data) {
            let state = game.entities.filter((e) => e.winBehaviorState)[0];
            if (state.winBehaviorState.won === false) {
                game.newLine(
                    `Congratulations, you have made tea! Did you find all three teabags? I wonder what happens if you infuse them all at once...`
                );
                state.winBehaviorState.won = true;
            }
        },
    });

    game.addEntity({
        name: "timer",

        invisible: true,
        timer: { time: -1 },
    });

    let area = game.entities.filter((e) => e.name === "room A")[0];
    console.log({ teaModRoom: area });
    let stove = game.addEntity(
        {
            name: "stove",
            active: false,
            surface: true,
        },
        area
    );

    let faucet = game.addEntity(
        {
            name: "faucet",
            fluidSource: "water",
        },
        area
    );

    let punchingBag = game.addEntity(
        {
            name: "punching bag",
            health: 5,
        },
        area
    );

    let teaCupboard = game.addEntity(
        {
            name: "tea cupboard",
            solidContainer: true,
            closed: true,
        },
        area
    );

    let cranberryTeabag = game.addEntity(
        {
            name: "cranberry teabag",
            item: true,
            infusable: {
                flavour: "OBVIOUS",
            },
        },
        teaCupboard
    );

    let table = game.addEntity(
        {
            name: "table",
            surface: true,
        },
        area
    );

    let knife = game.addEntity(
        {
            name: "knife",
            item: true,
        },
        table,
        "on"
    );

    let cup = game.addEntity(
        {
            name: "cup",
            item: true,
            fluidContainer: true,
        },
        table,
        "on"
    );

    let bowl = game.addEntity(
        {
            name: "bowl",
            item: true,
            fluidContainer: true,
        },
        table,
        "on"
    );

    let note = game.addEntity(
        {
            name: "super secret note",
            item: true,
            readable: {
                message: `The note says: "The password is 6...`,
            },
        },
        table,
        "on"
    );

    let lockedChest = game.addEntity(
        {
            name: "locked chest",
            solidContainer: true,
            closed: true,
            item: true,
            locked: { isLocked: true, password: `6` },
        },
        table,
        "on"
    );

    let smallerChest = game.addEntity(
        {
            name: "smaller chest",
            solidContainer: true,
            closed: true,
            item: true,
        },
        lockedChest,
        "in"
    );

    let evenSmallerChest = game.addEntity(
        {
            name: "even smaller chest",
            solidContainer: true,
            closed: true,
            item: true,
        },
        smallerChest,
        "in"
    );

    let secretTeabag = game.addEntity(
        {
            name: "secretive teabag",
            item: true,
            infusable: { flavour: "SECRET" },
        },
        smallerChest,
        "in"
    );
}

module.exports = { loadMod };
