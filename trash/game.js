// let setOps = require("./setOps")
// console.log(setOps)

function props(obj) {
    let arr = [];
    for (let property in obj) {
        if (obj.hasOwnProperty(property) && obj[property] != undefined) {
            arr.push(property);
        }
    }
    return arr;
}

function has(obj, prop) {
    return obj.hasOwnProperty(prop) && obj[prop] != undefined;
}

let health = 10;
let log = "Welcome.";
setTimeout(() => { newLine("Your health is " + health) }, 100);

class VerbForage {
    constructor() {
        this.name = "forage"
        this.kind = "verb"
    }
    canPick() {
        return true;
    }
    canExecute() {
        return cmd.length == 2;
    }
    execute() {
        newLine("Gathering " + cmd[1].name);
        let newObj = { kind: "object" }
        if (cmd[1].name == "berries") {
            newObj.name = "berries";
            newObj.kind = "food";
            newObj.deliciousness = 5;
            newObj.weight = 2;
        } else if (cmd[1].name == "wood") {
            newObj.name = "wood";
            newObj.weight = 4;
        }
        entities.push(newObj);
        console.log(entities);
    }
    options() {
        if (cmd.length === 1) {
            return [{ name: "berries", kind: "choice" }, { name: "wood", kind: "choice" }]
        } else return [];
    }
}

class VerbEat {
    constructor() {
        this.name = "eat"
        this.kind = "verb"
    }
    canPick() {
        return (entities.filter(e => e.kind == "food")).length;
    }
    canExecute() {
        return cmd.length == 2;
    }
    execute() {
        newLine("Eating " + cmd[1].name + "...");
        newLine("Your health is " + health);
        health += cmd[1].deliciousness;
        entities = entities.filter(e => e != cmd[1]);
    }
    options() {
        if (cmd.length === 1) {
            return entities.filter(e => e.kind == "food");
        } else return [];
    }
}

let cmd = [];
let cmdp = 0;
let entities = [];
let verbs = [
    new VerbForage(), new VerbEat(),
];


let options = []

function getThing(name) {
    for (let thing of entities) {
        if (thing.name === name) return thing;
    }
    return undefined;
}

function setOptions(options) {
    document.getElementById('choices').innerHTML = "";
    for (let i = 0; i < options.length; i++) {
        let optionName = options[i].name;
        // create a span with the optionName text
        var node = document.createElement("a");
        node.className = "choice";
        node.innerText = optionName;
        document.getElementById('choices').appendChild(node);
        // when the span is clicked, handle using that optionName
        node.addEventListener("click", () => handlePick(options[i]));
    }
    if (cmd.length > 0 && cmd[0].canExecute()) {
        let executeNode = document.createElement("a");
        executeNode.className = "execute";
        executeNode.innerText = "execute";
        document.getElementById('choices').appendChild(executeNode);
        executeNode.addEventListener("click", execute);
    }
    if (cmd.length > 0) {
        let cancelNode = document.createElement("a");
        cancelNode.className = "cancel";
        cancelNode.innerText = "cancel";
        document.getElementById('choices').appendChild(cancelNode);
        cancelNode.addEventListener("click", clearCommand);
    }
}

function getOptions() {
    // gets either all verbs, or verb options
    if (cmd.length === 0) {
        return verbs.filter(e => e.canPick());
    } else {
        console.log("cmd:", cmd);
        return cmd[0].options();
    }
}

function handlePick(option) {
    // adds an option to command and sets new options
    cmd.push(option);
    setOptions(getOptions());
    updateCurrentChoice();
}

function updateCurrentChoice() {
    document.getElementById("currentChoice").innerHTML = cmd.map(e => e.name).join(" ");
}

function clearCommand() {
    cmd = [];
    updateCurrentChoice();
    setOptions(getOptions());
}

function execute() {
    // tries to execute command
    if (cmd.length > 0 && cmd[0].canExecute()) {
        // newLine(cmd.map(e => e.name).join(" "));
        console.log(cmd.map(e => e.name).join(" "));
        cmd[0].execute();
        clearCommand();
    } else {

    }
}


setOptions(getOptions());

function newLine(text) {
    log += "\n" + text;
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    document.getElementById('display').innerText = log;
}