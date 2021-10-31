/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/GameModule.ts":
/*!***************************!*\
  !*** ./src/GameModule.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
// let utils = require("./utils")
// let timing = require("./timing");
var timing = __webpack_require__(/*! ./timing */ "./src/timing.ts");
var PriorityQueue_1 = __webpack_require__(/*! ./PriorityQueue */ "./src/PriorityQueue.ts");
var Game = /** @class */ (function () {
    function Game() {
        this.id = 0;
        this.entities = [];
        this.words = {};
        this.actionId = 0;
        this.history = [];
        this.log = [];
        this.intentsReady = true;
        this.queue = []; // [Action*]
        this.queueSpliceI = 0;
        this.handlers = new PriorityQueue_1.PriorityQueue(); // {on_eventType:func()}
        this.time = 0;
        this.player = null;
        this.playRandomly = false;
        this.actions = {};
    }
    Game.prototype.addEntity = function (entity, parentEntity, rel) {
        if (parentEntity === void 0) { parentEntity = null; }
        if (rel === void 0) { rel = null; }
        this.entities.push(entity);
        entity.id = this.id;
        this.id += 1;
        if (parentEntity !== null) {
            this.setParent(parentEntity, entity, rel);
        }
        return entity;
    };
    Game.prototype.getById = function (id) {
        var found = undefined;
        for (var i = 0; i < this.entities.length; i++) {
            if (this.entities[i].id === id) {
                found = this.entities[i];
            }
        }
        if (found === undefined)
            throw "object not found with id " + id;
        return found;
    };
    Game.prototype.getDepth = function (entity) {
        var depth = 0;
        while (this.getParent(entity) !== undefined) {
            entity = this.getParent(entity);
            depth += 1;
        }
        return depth;
    };
    Game.prototype.addHandler = function (value, handler) {
        this.handlers.enqueue({ value: value, element: handler });
        return handler;
    };
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // PARENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Game.prototype.setParent = function (parentEntity, childEntity, rel) {
        if (rel === void 0) { rel = null; }
        if (parentEntity === undefined ||
            parentEntity.id === undefined ||
            this.getById(parentEntity.id) === undefined)
            throw "Undefined parent.";
        this.unsetParent(childEntity);
        childEntity.parent = parentEntity.id;
        if (rel !== null) {
            childEntity.rel = rel;
        }
    };
    Game.prototype.setParentById = function (parentId, childId, rel) {
        if (rel === void 0) { rel = null; }
        this.setParent(this.getById(parentId), this.getById(childId), rel);
    };
    Game.prototype.unsetParent = function (childEntity) {
        childEntity.parent = undefined;
    };
    Game.prototype.isParent = function (parentEntity, childEntity) {
        return parentEntity.id === childEntity.parent;
    };
    Game.prototype.getParent = function (childEntity) {
        var parent = childEntity.parent === undefined
            ? undefined
            : this.getById(childEntity.parent);
        return parent;
    };
    Game.prototype.getChildren = function (entity) {
        // console.log("loop", entity.id);
        var contents = this.entities.filter(function (e) { return e.parent === entity.id; });
        // let contents = this.entities.filter((e) => this.isParent(entity, e));
        return contents;
    };
    Game.prototype.getChildrenById = function (id) {
        return this.getChildren(this.getById(id));
    };
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Game.prototype.deleteById = function (id) {
        // TODO? throw if not found
        this.entities = this.entities.filter(function (e) { return e.id !== id; });
    };
    Game.prototype.isAccessible = function (entity) {
        if (entity === undefined || this.getParent(entity) === undefined)
            return true;
        var parent = this.getParent(entity);
        var accessible = (parent.closed === false || parent.closed === undefined) &&
            (parent.locked === undefined || parent.locked.isLocked === false);
        return accessible && this.isAccessible(parent);
    };
    Game.prototype.enqueue = function (action, splice) {
        if (splice === void 0) { splice = true; }
        if (!splice) {
            this.queue.push(action);
        }
        else {
            this.queue.splice(this.queueSpliceI, 0, action);
            this.queueSpliceI++;
        }
    };
    Game.prototype.emitEvent = function (data) {
        for (var _i = 0, _a = this.handlers.asArray(); _i < _a.length; _i++) {
            var handler = _a[_i];
            if (handler["on_" + data.type]) {
                console.log({ data: data });
                handler["on_" + data.type](data);
            }
        }
    };
    Game.prototype.queueEvent = function (data) {
        this.enqueue({ events: [data] });
    };
    // called when action is first started
    Game.prototype.processAction = function (action) {
        if (action.maxDuration === undefined) {
            action.maxDuration = action.duration || 0;
            this.actionId += 1;
            action.id = this.actionId;
            var logItem = {
                id: action.id,
            };
            this.history.push(action);
            this.log.push(logItem);
        }
        return action;
    };
    Game.prototype.updateLog = function () {
        for (var i_1 = 0; i_1 < this.log.length; i_1++) {
            var logItem = this.log[i_1];
            var logId = logItem.id;
            for (var hc = 0; hc < this.history.length; hc++) {
                var action = this.history[hc];
                var actionId = action.id;
                // match log item to action
                if (logId === actionId) {
                    if (action.duration && action.duration >= 0) {
                        logItem.progressBar = "[" + ("=".repeat(action.maxDuration - action.duration) +
                            "-".repeat(action.duration)) + "]";
                        logItem.sticky = true;
                    }
                    else {
                        if (action.maxDuration > 0) {
                            logItem.progressBar = "[" + "=".repeat(action.maxDuration) + "]";
                        }
                        logItem.sticky = false;
                    }
                }
            }
        }
        this.log.sort(function (a, b) { return (a.sticky && !b.sticky ? 1 : 0); });
        // update UI
        var display = document.getElementById("display");
        display.innerText = "";
        var i = Math.max(0, this.log.length - 50);
        for (var _i = 0, _a = this.log.slice(i); _i < _a.length; _i++) {
            var logItem = _a[_i];
            if (logItem.text) {
                display.innerText += "\n" + logItem.text;
            }
            if (logItem.progressBar) {
                display.innerText += "\n" + logItem.progressBar;
            }
        }
        display.scrollTop = display.scrollHeight;
        console.log(this.log);
    };
    Game.prototype.newLine = function (text) {
        this.actionId += 1;
        var logItem = {
            text: "" + text,
            id: this.actionId,
        };
        this.log.push(logItem);
    };
    Game.prototype.getIntents = function () {
        var _this = this;
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.intentsReady = true;
        var _loop_1 = function (entity) {
            var intent = entity.actor.intent;
            // empty intent
            if (!intent) {
                this_1.intentsReady = false;
                // hang and reset for player input
                if (entity.player) {
                    if (!entity.picking) {
                        entity.picking = true;
                        entity.setOptionsUI();
                    }
                    setTimeout(function () {
                        var options = entity.getNextWords();
                        if (_this.playRandomly) {
                            if (entity.command.length > 0) {
                                entity.pickNextWord(Math.floor(Math.random() * (options.length - 1)));
                            }
                            else {
                                entity.pickNextWord(Math.floor(Math.random() * options.length));
                            }
                        }
                        _this.getIntents();
                    }, 100);
                }
            }
            else if (intent && intent.sequence.length > 0) {
                // extract actions and enqueue them
                var ticks = 0;
                // extract actions until we go over 1 tick
                while (ticks === 0 && intent.sequence.length > 0) {
                    // process and enqueue action
                    intent.sequence[0] = this_1.processAction(intent.sequence[0]);
                    var action = intent.sequence[0];
                    this_1.enqueue(action, false);
                    // queue up actions including the first with duration
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueSpliceIng
                        intent.sequence.splice(0, 1);
                    }
                    else if (action.duration > 0) {
                        // action that will be taken multiple times
                        ticks = action.duration;
                        // end actions here
                        if (action.duration <= 1) {
                            intent.sequence.splice(0, 1);
                        }
                        action.duration -= 1;
                    }
                    else {
                        // throw `Not sure what this means`;
                    }
                }
                // if the last action was extracted, render null
                if (intent.sequence.length === 0) {
                    entity.actor.intent = null;
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = this.entities.filter(function (e) { return e.actor; }); _i < _a.length; _i++) {
            var entity = _a[_i];
            _loop_1(entity);
        }
        // when ready, propagate events
        if (this.intentsReady) {
            // queue up a tick event
            this.queue.push({ events: [{ type: "tick" }] });
            // newLine(`starting tick ${game.time}`);
            this.processNext();
        }
    };
    Game.prototype.processNext = function () {
        var _this = this;
        // get next action to execute
        if (this.queue.length > 0) {
            this.queueSpliceI = 0;
            var action = this.queue.shift();
            // func: execute command
            if (action.func) {
                if (this.actions[action.func]) {
                    var func = this.actions[action.func];
                    if (action.args) {
                        func.apply(void 0, action.args);
                    }
                    else {
                        func();
                    }
                }
                else {
                    throw "Unknown action " + action.func + ", args " + action.args;
                }
            }
            // events: propagate events
            if (action.events && action.events.length > 0) {
                for (var _i = 0, _a = action.events; _i < _a.length; _i++) {
                    var event_1 = _a[_i];
                    // new event to propagate
                    var type = event_1.type;
                    // send to every handler
                    var responses = [];
                    console.log({ event: event_1, i: this.queueSpliceI });
                    for (var _b = 0, _c = this.handlers.asArray(); _b < _c.length; _b++) {
                        var handler = _c[_b];
                        if (handler["on_" + type]) {
                            handler["on_" + type](event_1);
                        }
                    }
                }
            }
            // pause: execute the next instantly or with pause
            this.updateUI();
            if (action.pause) {
                setTimeout(function () {
                    _this.processNext();
                }, action.pause);
            }
            else {
                this.processNext();
            }
        }
        else {
            // loop again
            this.time += 1;
            this.getIntents();
        }
    };
    Game.prototype.word = function (text) {
        if (!this.words[text]) {
            var word = { type: "word", baseName: text };
            this.words[text] = word;
        }
        return this.words[text];
    };
    Game.prototype.updateUI = function () {
        this.updateEntityTreeUI();
        this.updateClockUI();
        this.updateLog();
    };
    Game.prototype.updateEntityTreeUI = function () {
        var _this = this;
        // time
        var ticks = this.time % timing.tps;
        var hours = Math.floor(this.time / timing.tps / 3600);
        var minutes = Math.floor(this.time / timing.tps / 60);
        var seconds = Math.floor(this.time / timing.tps);
        var game = this;
        var treeNode = document.getElementById("entityTree");
        treeNode.innerHTML = "Time: " + hours + ":" + minutes + ":" + seconds + ":" + ticks + "\n\n</br>";
        // subtree
        function indentedSubtree(entity, depth) {
            if (depth === void 0) { depth = 0; }
            if (!entity.baseName || entity.invisible)
                return null;
            var healthText = entity.health > 0 ? "[" + "#".repeat(entity.health) + "]" : "";
            var focusedText = game.player.focus === entity.id ? "(focused)" : "";
            var textNode = document.createElement("a");
            // textNode.style.color = "lightgrey";
            textNode.innerText = "|" + "----".repeat(depth) + entity.baseName + " " + healthText + focusedText + "\n";
            textNode.className = "treeObject";
            if (game.getChildren(entity).length > 0) {
                for (var _i = 0, _a = game
                    .getChildren(entity)
                    .filter(function (e) { return game.isAccessible(e); }); _i < _a.length; _i++) {
                    var child = _a[_i];
                    var subtree = indentedSubtree(child, depth + 1);
                    if (subtree !== null)
                        textNode.appendChild(subtree);
                }
            }
            // on click, focus action
            textNode.addEventListener("click", function (e) {
                e = window.event || e;
                if (this === e.target) {
                    game.player.focus = entity.id;
                    game.player.command = [];
                    game.player.setOptionsUI();
                }
                game.updateEntityTreeUI();
            });
            return textNode;
        }
        for (var _i = 0, _a = this.entities.filter(function (e) { return _this.getDepth(e) === 0; }); _i < _a.length; _i++) {
            var entity = _a[_i];
            var subtree = indentedSubtree(entity, 0);
            if (subtree) {
                treeNode.appendChild(subtree);
            }
        }
    };
    Game.prototype.updateClockUI = function () {
        var clock = document.getElementById("clock");
        var ctx = clock.getContext("2d");
        var width = clock.clientWidth;
        var height = clock.clientHeight;
        // ctx.stroke = "white";
        ctx.clearRect(0, 0, width, height);
        ctx.fillText("" + this.time, width / 2 - 6, height / 2 + 5);
        // dots
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        for (var i = 0; i < 12; i++) {
            ctx.moveTo(20, 0);
            ctx.lineTo(25, 0);
            ctx.rotate((2 * Math.PI) / 12);
        }
        ctx.stroke();
        ctx.restore();
        // ticks
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        ctx.rotate((2 * Math.PI * this.time) / timing.tps);
        ctx.arc(10, 0, 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
        // seconds
        // ticks
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        ctx.rotate((2 * Math.PI * this.time) / timing.tps / 60);
        ctx.moveTo(10, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        ctx.restore();
    };
    return Game;
}());
exports.Game = Game;
// let g = new Game();
// let teapot = g.buildObject(
//     {
//         teapot: true,
//     },
//     [
//         ["is", { fluidContainer: true }],
//         ["has", { spout: true }],
//     ]
// );
// console.log(g.entities);


/***/ }),

/***/ "./src/PlayerModule.ts":
/*!*****************************!*\
  !*** ./src/PlayerModule.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var Player = /** @class */ (function () {
    function Player() {
        this.baseName = "player";
        this.player = true;
        this.actor = {
            intent: null,
        };
        this.picking = false;
        this.command = [];
        this.patterns = [];
        this.focus = null;
        this.id = -1;
    }
    Player.prototype.addPattern = function (pattern) {
        this.patterns.push(pattern);
    };
    Player.prototype.getAllIntents = function () {
        var intents = [];
        for (var _i = 0, _a = this.patterns; _i < _a.length; _i++) {
            var pattern = _a[_i];
            for (var _b = 0, _c = pattern.intents(); _b < _c.length; _b++) {
                var intent = _c[_b];
                intents.push(intent);
            }
        }
        return intents;
    };
    //^ getAllIntents(), command
    Player.prototype.getValidIntents = function () {
        // get remaining Intents that match the command and focus so far
        var validIntents = [];
        for (var _i = 0, _a = this.getAllIntents(); _i < _a.length; _i++) {
            var intent = _a[_i];
            // check intent for command validity
            var cmdValid = true;
            for (var i = 0; i < this.command.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    cmdValid = false;
                }
            }
            // check intent for focus validity, if any focus
            var focusValid = this.focus ? false : true;
            for (var _b = 0, _c = intent.representation; _b < _c.length; _b++) {
                var entity = _c[_b];
                if (entity.id === this.focus) {
                    focusValid = true;
                }
            }
            if (cmdValid && focusValid) {
                validIntents.push(intent);
            }
        }
        return validIntents;
    };
    //^ getValidIntents(), command
    // get options for next word to pick
    Player.prototype.getNextWords = function () {
        var options = [];
        var validIntents = this.getValidIntents();
        // console.log(`${validIntents.length} valid commands at command ${this.command.map(w => w.baseName)}`)
        for (var _i = 0, validIntents_1 = validIntents; _i < validIntents_1.length; _i++) {
            var intent = validIntents_1[_i];
            // if the intent is the same length as the command, it can be confirmed
            if (intent.representation.length == this.command.length) {
                options.push({ baseName: "> confirm <", type: "confirm" });
            }
            else {
                var newOption = intent.representation[this.command.length];
                var duplicateThing = false;
                for (var _a = 0, options_1 = options; _a < options_1.length; _a++) {
                    var option = options_1[_a];
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
            options.push({ baseName: "> cancel <", type: "cancel" });
        }
        return options;
    };
    //^ updateCommandUI()
    Player.prototype.pickNextWord = function (optionI) {
        var options = this.getNextWords();
        if (options[optionI].type === "confirm") {
            this.setIntent();
        }
        else if (options[optionI].type === "cancel") {
            this.command = [];
            this.focus = null;
        }
        else {
            this.command.push(options[optionI]);
        }
        this.updateCommandUI();
    };
    // getValidIntents(), clearCommand()
    // set intent and clear the command
    Player.prototype.setIntent = function () {
        var _this = this;
        // get valid intents
        var intents = this.getValidIntents();
        // from intents of command's length
        for (var _i = 0, _a = intents.filter(function (i) { return i.representation.length === _this.command.length; }); _i < _a.length; _i++) {
            var intent = _a[_i];
            console.log({ intent: intent, command: this.command });
            var valid = true;
            for (var i = 0; i < intent.representation.length; i++) {
                if (intent.representation[i] !== this.command[i]) {
                    console.log("execution wonk, not one valid action");
                    valid = false;
                }
            }
            if (valid) {
                // set intent, not picking
                this.actor.intent = intent;
                // intent.totalDuration = intent.sequence.reduce(
                //     (sum, action) => sum + action.duration || 0,
                //     0
                // );
                // intent.elapsed = 0;
                // console.log({ intent });
                this.picking = false;
                this.focus = null;
                // clear command
                this.command = [];
                this.updateCommandUI();
                return;
            }
        }
    };
    Player.prototype.updateCommandUI = function () {
        document.getElementById("command").innerHTML =
            ">" + this.command.map(function (e) { return e.baseName; }).join(" ");
    };
    Player.prototype.clearOptionsUI = function () {
        document.getElementById("options").innerHTML = "";
    };
    Player.prototype.setOptionsUI = function () {
        var _this = this;
        document.getElementById("options").innerHTML = "";
        if (!this.picking)
            return;
        // get the next words, and create an element for each on document
        var options = this.getNextWords();
        var keys = "abcdefghijklmnopqrstuwxyz".split("");
        var _loop_1 = function (i) {
            var optionText = options[i].baseName;
            // create a span with the optionText baseName
            shortcutNode = document.createElement("a");
            // shortcutNode.style.color = "lightgrey";
            shortcutNode.innerText = keys[i] + ") ";
            // keyboard shortcutNode
            optionNode = document.createElement("a");
            // optionNode.style.color = "white";
            optionNode.innerText = optionText;
            shortcutNode.appendChild(optionNode);
            document.getElementById("options").appendChild(shortcutNode);
            // when the span is clicked, handle using that optionText
            // REFACTOR: bad
            shortcutNode.addEventListener("click", function () {
                _this.pickNextWord(i);
                _this.setOptionsUI();
            });
            if (options[i].type === "confirm") {
                shortcutNode.className = "confirm";
            }
            else if (options[i].type === "cancel") {
                shortcutNode.className = "cancel";
            }
            else {
                shortcutNode.className = "choice";
            }
        };
        var shortcutNode, optionNode;
        for (var i = 0; i < options.length; i++) {
            _loop_1(i);
        }
    };
    return Player;
}());
exports.Player = Player;


/***/ }),

/***/ "./src/PriorityQueue.ts":
/*!******************************!*\
  !*** ./src/PriorityQueue.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var PriorityQueue = /** @class */ (function () {
    function PriorityQueue() {
        this.list = [];
    }
    PriorityQueue.prototype.enqueue = function (element) {
        this.list.push(element);
        this.reorganise();
        return element;
    };
    PriorityQueue.prototype.reorganise = function () {
        this.list = this.list.sort(function (a, b) { return a.value - b.value; });
    };
    PriorityQueue.prototype.getAt = function (i) {
        return this.list[i].element;
    };
    PriorityQueue.prototype.asArray = function () {
        return this.list.map(function (pqe) { return pqe.element; });
    };
    return PriorityQueue;
}());
exports.PriorityQueue = PriorityQueue;


/***/ }),

/***/ "./src/modDebug.ts":
/*!*************************!*\
  !*** ./src/modDebug.ts ***!
  \*************************/
/***/ ((module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var timing = __webpack_require__(/*! ./timing */ "./src/timing.ts");
function loadMod(player, game) {
    game.actions.wait = function (ticks) {
        game.newLine("Still waiting... of " + ticks);
    };
    function createNewLineAction(text) {
        return {
            func: "newLine",
            args: [text],
        };
    }
    function createWaitAction(ticks) {
        return {
            func: "wait",
            args: [ticks],
            duration: ticks,
            // 1 -> 1, 10 -> 2
            pause: timing.mpt / Math.pow(ticks, 1),
        };
    }
    // // wait various durations
    // player.patterns.push({
    //     intents: () => {
    //         let intents = [];
    //         let durations = [
    //             { baseName: "1 tick", dur: 1 },
    //             { baseName: "3 ticks", dur: 3 },
    //             { baseName: "6 ticks", dur: 6 },
    //             // { baseName: "12 ticks", dur: 12 },
    //             { baseName: "1 minute", dur: timing.m(1) },
    //             { baseName: "1 hour", dur: timing.h(1) },
    //             { baseName: "1 day", dur: timing.h(24) },
    //         ];
    //         for (let duration of durations) {
    //             let intent = {
    //                 representation: [
    //                     game.word("wait"),
    //                     game.word(duration.baseName),
    //                 ],
    //                 sequence: [
    //                     createNewLineAction(`You wait ${duration.dur} ticks.`),
    //                     createWaitAction(duration.dur),
    //                 ],
    //             };
    //             intents.push(intent);
    //         }
    //         return intents;
    //     },
    // });
    // random clapping
    player.addPattern({
        intents: function () {
            var intents = [];
            // the effect function
            function effect() {
                game.newLine("CLAP!");
            }
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("slow clap.")],
                sequence: [
                    createWaitAction(4),
                    createNewLineAction("CLAP!"),
                    createWaitAction(2),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                    createWaitAction(2),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                    createNewLineAction("CLAP!"),
                ],
            });
            return intents;
        },
    });
    function createPingAction() {
        return {
            func: "newLine",
            args: ["ping"],
            pause: 100,
            events: [{ type: "ping" }],
            duration: 0,
        };
    }
    // 3x ping, to be responded to with pong and peng
    player.addPattern({
        intents: function () {
            var intents = [];
            intents.push({
                representation: [game.word("DEBUG"), game.word("3 x ping.")],
                sequence: [
                    createPingAction(),
                    createPingAction(),
                    createPingAction(),
                ],
            });
            return intents;
        },
    });
    game.addHandler(0, {
        on_ping: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Pong!"],
                events: [{ type: "pong" }],
                pause: 300,
            });
        },
    });
    game.addHandler(0, {
        on_pong: function (data) {
            game.enqueue({
                func: "newLine",
                args: ["Peng!"],
                events: [{ type: "peng" }],
                pause: 300,
            });
        },
    });
    // plain longer action
    player.addPattern({
        intents: function () {
            var intents = [];
            // the sequence
            intents.push({
                representation: [
                    game.word("DEBUG"),
                    game.word("POW"),
                    game.word("POW"),
                    game.word("POW"),
                ],
                sequence: [createNewLineAction("POW POW POW!")],
            });
            return intents;
        },
    });
    // plain shorter action
    player.addPattern({
        intents: function () {
            var intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("POW")],
                sequence: [createNewLineAction("POW!")],
            });
            return intents;
        },
    });
    // duration 2 action that releases pings
    player.addPattern({
        intents: function () {
            var intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("long-ping")],
                sequence: [
                    {
                        func: "newLine",
                        args: ["piiiiiiiiing!"],
                        pause: 300,
                        events: [{ type: "ping" }],
                        duration: 2,
                    },
                ],
            });
            return intents;
        },
    });
    // 3 ticks
    player.addPattern({
        intents: function () {
            var intents = [];
            // the sequence
            intents.push({
                representation: [game.word("DEBUG"), game.word("wait 3 ticks")],
                sequence: [createWaitAction(3)],
            });
            return intents;
        },
    });
    // tick timers up
    game.addHandler(0, {
        on_tick: function (data) {
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.timer; }); _i < _a.length; _i++) {
                var timer = _a[_i];
                timer.timer.time += 1;
            }
        },
    });
}
module.exports = { loadMod: loadMod };


/***/ }),

/***/ "./src/modTeaRoom.ts":
/*!***************************!*\
  !*** ./src/modTeaRoom.ts ***!
  \***************************/
/***/ (function(module, exports, __webpack_require__) {


var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var timing = __webpack_require__(/*! ./timing */ "./src/timing.ts");
function loadMod(player, game) {
    game.actions.newLine = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return (_a = game.newLine).call.apply(_a, __spreadArrays([game], args));
    };
    // let newLine = game.newLine;
    game.actions.wait = function (ticks) {
        if (ticks === void 0) { ticks = 0; }
        // game.newLine(`Still waiting... of ${ticks}`);
    };
    function createNewLineAction(text) {
        return {
            func: "newLine",
            args: [text],
        };
    }
    function createWaitAction(ticks, processText) {
        if (processText === void 0) { processText = "Waiting..."; }
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
        intents: function () {
            var intents = [];
            var durations = [
                { baseName: "1 tick", dur: 1 },
                { baseName: "3 ticks", dur: 3 },
                { baseName: "6 ticks", dur: 6 },
                { baseName: "12 ticks", dur: 12 },
                { baseName: "60 ticks", dur: 60 },
            ];
            for (var _i = 0, durations_1 = durations; _i < durations_1.length; _i++) {
                var duration = durations_1[_i];
                var intent = {
                    representation: [
                        game.word("wait"),
                        game.word(duration.baseName),
                    ],
                    sequence: [
                        createNewLineAction("You wait " + duration.dur + " ticks."),
                        createWaitAction(duration.dur),
                    ],
                };
                intents.push(intent);
            }
            return intents;
        },
    });
    game.actions.fillFrom = function (fluidSourceId, fluidContainerId) {
        var fluidSource = game.getById(fluidSourceId);
        var fluidContainer = game.getById(fluidContainerId);
        var fluid = game.addEntity({
            baseName: fluidSource.fluidSource,
            fluid: true,
            temperature: 20,
        }, fluidContainer);
        game.newLine("You fill up the " + fluidContainer.baseName + " from the " + fluidSource.baseName + " with " + fluid.baseName);
    };
    function fluidsIn(fluidContainer) {
        var fluidChildren = game
            .getChildren(fluidContainer)
            .filter(function (e) { return e.fluid; });
        return fluidChildren.length > 0;
    }
    // fill container from fluidSource
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.fluidSource; }); _i < _a.length; _i++) {
                var fluidSource = _a[_i];
                for (var _b = 0, _c = game.entities.filter(function (e) { return e.fluidContainer && !fluidsIn(e); }); _b < _c.length; _b++) {
                    var nonEmptyFluidContainer = _c[_b];
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
        var container = game.getById(containerId);
        var containerParent = game.getParent(container);
        game.newLine("You empty the " + container.baseName + " on the " + containerParent.baseName + ".");
        for (var _i = 0, _a = game.getChildrenById(containerId); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.fluid) {
                game.deleteById(child.id);
            }
            else {
                game.setParent(containerParent, child);
            }
        }
    };
    player.addPattern({
        // empty container
        intents: function () {
            var intents = [];
            // nonempty fluid containers
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.fluidContainer && game.getChildren(e).length !== 0; }); _i < _a.length; _i++) {
                var nonEmptyFluidContainer = _a[_i];
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
        var source = game.getById(sourceId);
        var destination = game.getById(destinationId);
        for (var _i = 0, _a = game.getChildren(source); _i < _a.length; _i++) {
            var child = _a[_i];
            game.newLine("You pour the " + child.baseName + " from the " + source.baseName + " into the " + destination.baseName + ".");
            game.setParent(destination, child);
        }
    };
    player.addPattern({
        // pour X into Y
        intents: function () {
            var intents = [];
            var isNonEmptyFluidContainer = function (e) {
                return e.fluidContainer && game.getChildren(e).length !== 0;
            };
            var isEmptyContainer = function (e) { return e.fluidContainer && !fluidsIn(e); };
            for (var _i = 0, _a = game.entities.filter(isNonEmptyFluidContainer); _i < _a.length; _i++) {
                var sourceContainer = _a[_i];
                for (var _b = 0, _c = game.entities.filter(isEmptyContainer); _b < _c.length; _b++) {
                    var destinationContainer = _c[_b];
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
    game.actions.setParentById = function (parentId, childId, rel) {
        return game.setParentById(parentId, childId, rel);
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.item && game.isAccessible(e); }); _i < _a.length; _i++) {
                var entity = _a[_i];
                for (var _b = 0, _c = game.entities.filter(function (e) { return e.surface; }); _b < _c.length; _b++) {
                    var surface = _c[_b];
                    intents.push({
                        representation: [
                            game.word("put"),
                            entity,
                            game.word("on"),
                            surface,
                        ],
                        sequence: [
                            createNewLineAction("You put the " + entity.baseName + " on the " + surface.baseName),
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
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.infusable && game.isAccessible(e); }); _i < _a.length; _i++) {
                var infusable = _a[_i];
                for (var _b = 0, _c = game.entities.filter(function (e) { return e.fluidContainer; }); _b < _c.length; _b++) {
                    var fluidContainer = _c[_b];
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
        var switchable = game.getById(switchableId);
        switchable.active = !switchable.active;
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.active !== undefined && e.active === false; }); _i < _a.length; _i++) {
                var entity = _a[_i];
                intents.push({
                    representation: [game.word("turn on"), entity],
                    sequence: [
                        createNewLineAction("You turn on the " + entity.baseName),
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
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.active !== undefined && e.active === true; }); _i < _a.length; _i++) {
                var entity = _a[_i];
                intents.push({
                    representation: [game.word("turn off"), entity],
                    sequence: [
                        createNewLineAction("You turn off the " + entity.baseName),
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
        var chest = game.getById(chestId);
        if (trialPassword === chest.locked.password) {
            chest.locked.isLocked = false;
            game.newLine("The locks click open.");
        }
        else {
            game.newLine("Incorrect password.");
        }
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.locked && game.isAccessible(e); }); _i < _a.length; _i++) {
                var chest = _a[_i];
                for (var i0 = 0; i0 < 10; i0++) {
                    // for (let i1 = 0; i1 < 10; i1++) {
                    // for (let i2 = 0; i2 < 10; i2++) {
                    // the sequence
                    intents.push({
                        representation: [
                            game.word("unlock"),
                            chest,
                            game.word(String(i0)),
                        ],
                        // representation: [game.word(`unlock`), chest, game.word(String(i0)), game.word(String(i1)), game.word(String(i2))],
                        sequence: [
                            {
                                func: "tryUnlock",
                                args: [chest.id, "" + i0],
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
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.readable; }); _i < _a.length; _i++) {
                var entity = _a[_i];
                // the sequence
                intents.push({
                    representation: [game.word("read"), entity],
                    sequence: [
                        createNewLineAction("You read the note..."),
                        createNewLineAction("" + entity.readable.message),
                    ],
                });
            }
            return intents;
        },
    });
    game.actions.tryOpen = function (entityId) {
        var entity = game.getById(entityId);
        if (entity.locked && entity.locked.isLocked) {
            game.newLine("The " + entity.baseName + " seems to be locked...");
        }
        else if (entity.closed === true) {
            entity.closed = false;
            game.newLine("You open the " + entity.baseName);
            game.newLine("It contains: " + game
                .getChildren(entity)
                .map(function (e) { return e.baseName; })
                .join(","));
        }
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.closed && game.isAccessible(e); }); _i < _a.length; _i++) {
                var entity = _a[_i];
                intents.push({
                    representation: [game.word("open"), entity],
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
        var attacker = game.getById(attackerId);
        var target = game.getById(targetId);
        var sounds = ["POW!", "Bam!", "Boom!", "Zock!"];
        game.newLine("You punch the " + target.baseName + "! " + sounds[Math.floor(Math.random() * sounds.length)]);
        if (target.health < 5) {
            game.newLine("Some fluff flies out of the ruptures. 1 damage!");
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
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.health > 0; }); _i < _a.length; _i++) {
                var entity = _a[_i];
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
        var container = game.getById(containerId);
        for (var _i = 0, _a = game.getChildren(container).filter(function (e) { return e.fluid; }); _i < _a.length; _i++) {
            var fluid = _a[_i];
            if (fluid.turboTea) {
                game.newLine("You feel like a 400 IQ, cupboard-opening, killing machine! In fact, you feel so good you feel like giving Gardens some feedback on their game!");
            }
            else if (fluid.tea) {
                game.newLine("It's not too bad. It's... fine.");
            }
            else {
                game.newLine("It's important to stay hydrated, I guess.");
            }
        }
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) {
                return fluidsIn(e);
            }); _i < _a.length; _i++) {
                var nonEmptyFluidContainer = _a[_i];
                intents.push({
                    representation: [
                        game.word("sip from"),
                        nonEmptyFluidContainer,
                    ],
                    sequence: [
                        createNewLineAction("You sip from the " + nonEmptyFluidContainer.baseName + "."),
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
        var target = game.getById(targetId);
        if (target.health === 5)
            game.newLine("You let out a piercing shriek as you ready your razor-sharp, glassy claws!");
        else
            game.newLine("You ready your claws again!");
    };
    game.actions.claw = function (attackerId, targetId) {
        var attacker = game.getById(attackerId);
        var target = game.getById(targetId);
        game.newLine("You tear out the " + target.baseName + "'s insides for 2 damage!");
        target.health -= 2;
        game.queueEvent({
            type: "damageDealt",
            from: attacker,
            to: target,
            amount: 2,
        });
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.health > 0; }); _i < _a.length; _i++) {
                var target = _a[_i];
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
        on_damageDealt: function (data) {
            game.newLine("Damage dealt by " + data.from.baseName);
            if (data.to.health <= 0 && !data.to.dead) {
                data.to.dead = true;
                game.newLine("You have defeated your first enemy, a vile " + data.to.baseName + ". It drops a teabag!");
                data.to.baseName = "dead " + data.to.baseName;
                data.health = undefined;
                game.addEntity({
                    baseName: "VICTORIOUS teabag",
                    item: true,
                    infusable: {
                        flavour: "VICTORY",
                    },
                }, game.getParent(data.to));
            }
        },
    });
    game.addHandler(0, {
        on_tick: function (data) {
            var _loop_1 = function (stove_1) {
                if (stove_1.active) {
                    stove_1.ctr += 1;
                    // put out a message regularly
                    if (stove_1.ctr >= 2) {
                        stove_1.ctr = 0;
                        game.newLine("The stove's flame burns a warm orange.");
                    }
                    var _loop_2 = function (containerOnStove) {
                        // game.newLine(
                        //     `The stove heats up the ${containerOnStove.baseName}`
                        // );
                        for (var _i = 0, _a = game.entities.filter(function (fluid) {
                            return fluid.fluid &&
                                game.isParent(containerOnStove, fluid);
                        }); _i < _a.length; _i++) {
                            var fluid = _a[_i];
                            // game.newLine(
                            //     `The stove heats up the ${fluid.baseName} in the ${containerOnStove.baseName}`
                            // );
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                game.newLine("The " + containerOnStove.baseName + " is filled with hot " + fluid.baseName + "!");
                            }
                        }
                    };
                    // heat up fluid inside containers on stove
                    for (var _i = 0, _a = game.entities.filter(function (containerOnStove) {
                        return containerOnStove.fluidContainer &&
                            game.isParent(stove_1, containerOnStove);
                    }); _i < _a.length; _i++) {
                        var containerOnStove = _a[_i];
                        _loop_2(containerOnStove);
                    }
                }
            };
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.baseName === "stove"; }); _i < _a.length; _i++) {
                var stove_1 = _a[_i];
                _loop_1(stove_1);
            }
        },
    });
    game.addHandler(900, {
        on_tick: function (data) {
            var _loop_3 = function (fluidContainer) {
                for (var _i = 0, _a = game.entities.filter(function (hotFluid) {
                    return hotFluid.fluid &&
                        game.isParent(fluidContainer, hotFluid) &&
                        hotFluid.temperature > 23;
                }); _i < _a.length; _i++) {
                    var hotFluid = _a[_i];
                    var count = 0;
                    var prefix = "";
                    // if infusable in container and hot fluid
                    for (var _b = 0, _c = game.entities.filter(function (e) { return e.infusable && game.isParent(fluidContainer, e); }); _b < _c.length; _b++) {
                        var infusingTeabag = _c[_b];
                        count += 1;
                        prefix += infusingTeabag.infusable.flavour + " ";
                        game.queueEvent({ type: "teaMade" });
                        if (count < 3) {
                            hotFluid.baseName = prefix + " tea";
                            hotFluid.tea = true;
                        }
                        else {
                            hotFluid.baseName = "TURBO TESTER TEA";
                            if (!hotFluid.turboTea) {
                                hotFluid.turboTea = true;
                                game.newLine("TOTAL VICTORY ACHIEVED! Enjoy your tea!");
                            }
                        }
                        // console.log("hotFluid", hotFluid);
                    }
                }
            };
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.fluidContainer; }); _i < _a.length; _i++) {
                var fluidContainer = _a[_i];
                _loop_3(fluidContainer);
            }
        },
    });
    game.addEntity({
        baseName: "winBehaviourState",
        invisible: true,
        winBehaviorState: { won: false, uberWon: false },
    });
    game.addHandler(1000, {
        on_teaMade: function (data) {
            var state = game.entities.filter(function (e) { return e.winBehaviorState; })[0];
            if (state.winBehaviorState.won === false) {
                game.newLine("Congratulations, you have made tea! Did you find all three teabags? I wonder what happens if you infuse them all at once...");
                state.winBehaviorState.won = true;
            }
        },
    });
    game.addEntity({
        baseName: "timer",
        invisible: true,
        timer: { time: -1 },
    });
    var area = game.entities.filter(function (e) { return e.area; })[0];
    var stove = game.addEntity({
        baseName: "stove",
        active: false,
        surface: true,
    }, area);
    var faucet = game.addEntity({
        baseName: "faucet",
        fluidSource: "water",
    }, area);
    var punchingBag = game.addEntity({
        baseName: "punching bag",
        health: 5,
    }, area);
    var teaCupboard = game.addEntity({
        baseName: "tea cupboard",
        solidContainer: true,
        closed: true,
    }, area);
    var cranberryTeabag = game.addEntity({
        baseName: "cranberry teabag",
        item: true,
        infusable: {
            flavour: "OBVIOUS",
        },
    }, teaCupboard);
    var table = game.addEntity({
        baseName: "table",
        surface: true,
    }, area);
    var knife = game.addEntity({
        baseName: "knife",
        item: true,
    }, table, "on");
    var cup = game.addEntity({
        baseName: "cup",
        item: true,
        fluidContainer: true,
    }, table, "on");
    var bowl = game.addEntity({
        baseName: "bowl",
        item: true,
        fluidContainer: true,
    }, table, "on");
    var note = game.addEntity({
        baseName: "super secret note",
        item: true,
        readable: {
            message: "The note says: \"The password is 6...",
        },
    }, table, "on");
    var lockedChest = game.addEntity({
        baseName: "locked chest",
        solidContainer: true,
        closed: true,
        item: true,
        locked: { isLocked: true, password: "6" },
    }, table, "on");
    var smallerChest = game.addEntity({
        baseName: "smaller chest",
        solidContainer: true,
        closed: true,
        item: true,
    }, lockedChest, "in");
    var evenSmallerChest = game.addEntity({
        baseName: "even smaller chest",
        solidContainer: true,
        closed: true,
        item: true,
    }, smallerChest, "in");
    var secretTeabag = game.addEntity({
        baseName: "secretive teabag",
        item: true,
        infusable: { flavour: "SECRET" },
    }, smallerChest, "in");
}
module.exports = { loadMod: loadMod };


/***/ }),

/***/ "./src/timing.ts":
/*!***********************!*\
  !*** ./src/timing.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
// ticks per second
exports.tps = 6;
// milliseconds per tick
exports.mpt = 300;
function s(nr) {
    return exports.tps * nr;
}
exports.s = s;
function m(nr) {
    return exports.tps * nr * 60;
}
exports.m = m;
function h(nr) {
    return exports.tps * nr * 3600;
}
exports.h = h;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
var GameModule = __webpack_require__(/*! ./GameModule */ "./src/GameModule.ts");
var PlayerModule = __webpack_require__(/*! ./PlayerModule */ "./src/PlayerModule.ts");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
var game = new GameModule.Game();
var player = new PlayerModule.Player();
game.player = player;
// load mods
var teaRoomMod = __webpack_require__(/*! ./modTeaRoom */ "./src/modTeaRoom.ts");
teaRoomMod.loadMod(player, game);
var debugMod = __webpack_require__(/*! ./modDebug */ "./src/modDebug.ts");
debugMod.loadMod(player, game);
var debug = false;
var area = game.addEntity({
    baseName: "room",
    area: true,
});
game.addEntity(player, area);
console.log(game.entities);
console.log("comps of area");
var keys = "abcdefghijklmnopqrstuwxyz".split("");
document.addEventListener("keypress", function (event) {
    var name = event.key;
    if (name === "`") {
        game.playRandomly = !game.playRandomly;
    }
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
function debugText(text) {
    document.getElementById("debug").innerText = text;
}

})();

/******/ })()
;
//# sourceMappingURL=bundle.js.map