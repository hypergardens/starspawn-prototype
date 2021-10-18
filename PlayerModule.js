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
        // let intent = intents[0];
        for (let intent of intents.filter(i => i.representation.length === this.command.length)) {
            console.log({ intent, command: this.command });

            let valid = true;
            for (let i = 0; i < intent.representation.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    console.log("EXECUTION WONK, NOT ONE VALID ACTION");
                    valid = false;
                }
            }
            if (valid) {
                // set intent, not picking
                this.intent = intent;
                this.picking = false;

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

        let keys = "abcdefghijklmnopqrstuvwxyz".split("");

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