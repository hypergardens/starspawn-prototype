// smell {smell:str} -> log
patterns.push({
    verb: { text: `smell` },
    actions: function() {
        // smell
        let actions = [];
        for (let thing of things) {
            if (thing.smell) {
                actions.push({
                    representation: [this.verb, thing],
                    effect: function() {
                        console.log(`It smells ${thing.smell}`);
                        newLine(`It smells ${thing.smell}`);
                    }
                });
            }
        }
        return actions;
    }
});


patterns.push({
    verb: { text: "bouquet" },
    actions: function() {
        // bouquet
        let actions = [];
        // // // // actions.push({ representation: [this.verb, { text: "~smell~" }, { text: "~smell~" }], abstract: true })
        for (let thing0 of things) {
            for (let thing1 of things) {
                if (thing0 !== thing1 && thing0.smell && thing1.smell) {
                    actions.push({
                        representation: [this.verb, thing0, thing1],
                        effect: function() {
                            newLine(`She bundles the ${thing0.text} and ${thing1.text}`)
                        }
                    });
                }
            }
        }
        return actions;
    }
});

patterns.push({
    verb: { text: "eat" },
    actions: function() {
        // eat
        let actions = [];
        // // // // actions.push({ representation: [this.verb, { text: "~smell~" }, { text: "~smell~" }], abstract: true })
        for (let thing of things) {
            if (thing.smell) {
                actions.push({
                    representation: [this.verb, thing],
                    effect: function() {
                        newLine(`She eats the ${thing.text}. Its flavour is ${thing.smell}`);
                        deleteThing(thing);
                    }
                });
            }
        }
        return actions;
    }
});



function tick() {
    let advance = false;
    // player has no intent
    if (player.intent === undefined) {
        // player has no intent, has winddown, reduce
        if (player.winddown > 0) {
            player.winddown -= 1;
            // reset options
            if (player.winddown <= 0) {
                setOptions();
            } else {
                clearOptions();
            }
            return true;
        }
        // player has no intent, no winddown, pick
        else {
            return false;
        }
    }
    // player has intent
    else {
        // player has intent, has windup
        if (player.windup > 0) {
            player.windup -= 1;
            return true;
        }
        // player has intent, no windup
        else {
            // take effect
            player.intent.effect();
            player.intent = undefined;
            return false;
        }
    }
}





patterns.push({
    verb: { text: "pick up" },
    actions: function() {
        // pick up
        let actions = [];
        // actions.push({ representation: [this.verb, { text: "~light item~" }], abstract: true })
        for (let thing of things) {
            if (thing.inv !== undefined && thing.inv === false) {
                actions.push({
                    representation: [this.verb, thing],
                    windup: 5,
                    winddown: 5,
                    condition: function() {
                        return getById(thing.id);
                    },
                    effect: function() {
                        newLine(`She picks up the ${thing.text} on tick ${time}`)
                        console.log(thing)
                        thing.inv = true;
                    }
                });
            }
        }
        return actions;
    }
});

patterns.push({
    verb: { text: "drop" },
    actions: function() {
        // drop
        let actions = [];
        // actions.push({ representation: [this.verb, { text: "~light item~" }], abstract: true })
        for (let thing of things) {
            if (thing.inv !== undefined && thing.inv === true) {
                actions.push({
                    representation: [this.verb, thing],
                    effect: function() {
                        newLine(`She drops the ${thing.text}`)
                        console.log(thing)
                        thing.inv = false;
                    }
                });
            }
        }
        return actions;
    }
});