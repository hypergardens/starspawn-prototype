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