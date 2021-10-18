let createWait = require("./actions").createWait;
let utils = require("./utils");
let newLine = utils.newLine;

function addPatterns(player, game) {
    player.addPattern({
        durations: [
            { baseName: "1 tick", dur: 1 },
            { baseName: "3 ticks", dur: 3 },
            { baseName: "6 ticks", dur: 6 },
            { baseName: "12 ticks", dur: 12 },
            { baseName: "60 ticks", dur: 60 },
        ],
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
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("POW"), game.word("POW"), game.word("POW")],
                sequence: [{
                    effect: () => { newLine("POW POW POW!") },
                }],
            })
            return intents;
        }
    })

    player.addPattern({
        intents: function() {
            let intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("POW")],
                sequence: [{
                    effect: () => { newLine("POW!") },
                }],
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
                        game.emitSignal({ type: "damageDealt", by: player, to: entity, amount: 2 });
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