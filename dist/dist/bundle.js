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
        this.logId = 0;
        this.history = {};
        this.log = {};
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
    // ENTITY LOOKUP
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Game.prototype.intentless = function () {
        return this.entities.filter(function (e) { return e.actor && e.actor.intent === null; });
    };
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // QUALITY
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Game.prototype.getTotalQuality = function (entityId, qualityName) {
        var acceptableLinks = ["activeItem", "attachment"];
        var game = this;
        function getQualitySubtree(entityId, baseQ, addQ, mulQ) {
            if (baseQ === void 0) { baseQ = 0; }
            if (addQ === void 0) { addQ = 0; }
            if (mulQ === void 0) { mulQ = 1; }
            var entity = game.getById(entityId);
            // check qualities
            for (var _i = 0, _a = game
                .getChildren(entity)
                .filter(function (q) { return q.quality; }); _i < _a.length; _i++) {
                var quality = _a[_i];
                if (quality.quality.name === qualityName) {
                    baseQ = quality.quality.value;
                }
                else if (quality.quality.name === "add" + qualityName) {
                    addQ += quality.quality.value;
                }
                else if (quality.quality.name === "mul" + qualityName) {
                    mulQ *= quality.quality.value;
                }
            }
            for (var _b = 0, _c = game.getChildren(entity); _b < _c.length; _b++) {
                var child = _c[_b];
                // if acceptable link
                if (acceptableLinks.indexOf(child.rel) != -1) {
                    var subtree = getQualitySubtree(child.id, baseQ, addQ, mulQ);
                    baseQ = subtree.baseQ;
                    addQ += subtree.addQ;
                    mulQ *= subtree.mulQ;
                }
            }
            return {
                baseQ: baseQ,
                addQ: addQ,
                mulQ: mulQ,
            };
        }
        var pack = getQualitySubtree(entityId);
        var baseQ = pack.baseQ, addQ = pack.addQ, mulQ = pack.mulQ;
        console.log({ qualityName: qualityName, baseQ: baseQ, addQ: addQ, mulQ: mulQ });
        return (baseQ + addQ) * mulQ;
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
        var responses = [];
        for (var _i = 0, _a = this.handlers.asArray(); _i < _a.length; _i++) {
            var handler = _a[_i];
            if (handler["on_" + data.type]) {
                responses.push(handler["on_" + data.type](data));
            }
        }
        return responses;
    };
    Game.prototype.queueEvent = function (data) {
        this.enqueue({ events: [data] });
    };
    // called when action is first started
    Game.prototype.processAction = function (action, actor) {
        if (action.maxDuration === undefined) {
            action.maxDuration = action.duration || 0;
            this.logId += 1;
            // set properties and insert to history
            action.id = this.logId;
            this.history[action.id] = action;
            action.actor = actor.id;
            // update logItem
            this.updateLogItem(action.id);
        }
        return action;
    };
    Game.prototype.updateLogItem = function (logId) {
        var playerId = this.entities.filter(function (e) { return e.player; })[0].id;
        // if no action at id, leave alone
        if (!this.history[logId]) {
            return;
        }
        else {
            // no log, has action
            var action = this.history[logId];
            // compute sticky and progressBar
            var sticky = void 0, progressBar = void 0;
            if (action.duration && action.duration >= 0) {
                progressBar = "[" + ("=".repeat(action.maxDuration - action.duration) +
                    "-".repeat(action.duration)) + "] " + (action.processText ? action.processText : "");
                sticky = true;
            }
            else {
                if (action.maxDuration > 0) {
                    progressBar = "[" + "=".repeat(action.maxDuration) + "]";
                }
                else {
                    progressBar = "";
                }
                sticky = false;
            }
            this.log[logId] = {
                id: logId,
                text: action.processText ? action.processText : "",
                sticky: sticky,
                progressBar: progressBar,
                alignLeft: playerId === action.actor,
            };
        }
    };
    Game.prototype.updateLog = function () {
        // clear display
        var display = document.getElementById("display");
        display.innerText = "";
        for (var i = 0; i <= this.logId; i++) {
            this.updateLogItem(i);
            // update UI at i
            if (this.log[i]) {
                var logItem = this.log[i];
                var node_1 = document.createElement("div");
                node_1.id = "logItem" + logItem.id;
                node_1.innerText += "\n" + logItem.text;
                node_1.innerText += "\n" + logItem.progressBar;
                node_1.style.textAlign = logItem.alignLeft ? "left" : "right";
                display.appendChild(node_1);
                display.scrollTop = display.scrollHeight;
            }
        }
    };
    Game.prototype.newLine = function (text) {
        this.logId += 1;
        var logItem = {
            text: "" + text,
            id: this.logId,
            alignLeft: true,
            sticky: false,
            progressBar: "",
        };
        this.log[this.logId] = logItem;
        return logItem;
    };
    Game.prototype.getPlayerIntent = function () {
        var _this = this;
        if (this.player) {
            if (!this.player.actor.intent) {
                // lay out options if necessary
                if (!this.player.picking) {
                    this.player.picking = true;
                    this.player.setOptionsUI();
                }
                if (this.playRandomly) {
                    // pick random word and call this function again
                    setTimeout(function () {
                        var options = _this.player.getNextWords();
                        // avoid cancelling actions if not on first word
                        if (_this.player.command.length > 0) {
                            _this.player.pickNextWord(Math.floor(Math.random() * (options.length - 1)));
                        }
                        else {
                            // pick any first word
                            _this.player.pickNextWord(Math.floor(Math.random() * options.length));
                        }
                        _this.getPlayerIntent();
                    }, 100);
                }
                else {
                    // hang for manual pick
                    setTimeout(function () {
                        _this.getPlayerIntent();
                    }, 100);
                }
            }
            else {
                // player intent done, move on to NPCs
                this.getNPCIntents();
            }
        }
    };
    Game.prototype.getNPCIntents = function () {
        this.emitEvent({ type: "getIntents" });
        this.processIntents();
    };
    Game.prototype.processIntents = function () {
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.intentsReady = true;
        for (var _i = 0, _a = this.entities.filter(function (e) { return e.actor; }); _i < _a.length; _i++) {
            var entity = _a[_i];
            var intent = entity.actor.intent;
            // empty intent
            if (!intent) {
                this.intentsReady = false;
                throw "entity without intent " + entity.name;
                // hang and reset for player input
            }
            else if (intent && intent.sequence.length > 0) {
                // extract actions and enqueue them
                var ticks = 0;
                // extract actions until we go over 1 tick
                while (ticks === 0 && intent.sequence.length > 0) {
                    // process and enqueue action
                    intent.sequence[0] = this.processAction(intent.sequence[0], entity);
                    var action = intent.sequence[0];
                    this.enqueue(action, false);
                    // queue up actions including the first with duration
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueSplicing
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
                    var responses = this.emitEvent(event_1);
                    // TODO: blocking and response collection
                     false && 0;
                     false && 0;
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
            this.getPlayerIntent();
        }
    };
    Game.prototype.word = function (text) {
        if (!this.words[text]) {
            var word = { type: "word", name: text };
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
            if ((!entity.name && !entity.quality) || entity.invisible)
                return null;
            // base text and focus
            var text = "";
            var focusedText = game.player.focus === entity.id ? "(focused)" : "";
            // object or quality
            if (entity.quality) {
                text = "Q: " + entity.quality.name + " " + entity.quality.value;
            }
            else if (entity.name) {
                text = "" + entity.name;
            }
            // assemble text chunk
            var textNode = document.createElement("a");
            textNode.innerText = "|" + "----".repeat(depth) + " " + text + " " + focusedText + "\n";
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
                    if (game.player.focus === entity.id) {
                        game.player.focus = null;
                    }
                    else {
                        game.player.focus = entity.id;
                    }
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


/***/ }),

/***/ "./src/PlayerModule.ts":
/*!*****************************!*\
  !*** ./src/PlayerModule.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var Player = /** @class */ (function () {
    function Player() {
        this.parent = undefined;
        this.name = "player";
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
        // console.log(`${validIntents.length} valid commands at command ${this.command.map(w => w.name)}`)
        for (var _i = 0, validIntents_1 = validIntents; _i < validIntents_1.length; _i++) {
            var intent = validIntents_1[_i];
            // if the intent is the same length as the command, it can be confirmed
            if (intent.representation.length == this.command.length) {
                options.push({ name: "> confirm <", type: "confirm" });
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
            options.push({ name: "> cancel <", type: "cancel" });
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
            ">" + this.command.map(function (e) { return e.name; }).join(" ");
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
            var optionText = options[i].name;
            // create a span with the optionText name
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
function loadMod(game) {
    var player = game.entities.filter(function (e) { return e.player; })[0];
    game.actions.wait = function (ticks) {
        // game.newLine(`Still waiting... of ${ticks}`);
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
    game.actions.traverse = function (actorId, pathId) {
        var path = game.getById(pathId);
        var origin = game.getById(path.path.from);
        var destination = game.getById(path.path.to);
        var actor = game.getById(actorId);
        if (actor.player) {
            game.newLine("You go to " + destination.name);
        }
        game.queueEvent({
            type: "traverse",
        });
        actor.parent = destination.id;
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.path && e.path.from === player.parent; }); _i < _a.length; _i++) {
                var path = _a[_i];
                intents.push({
                    representation: [
                        game.word("go:"),
                        game.getById(path.path.to),
                    ],
                    sequence: [
                        createWaitAction(path.path.distance),
                        { func: "traverse", args: [player.id, path.id] },
                    ],
                });
            }
            return intents;
        },
    });
    // // wait various durations
    // player.patterns.push({
    //     intents: () => {
    //         let intents = [];
    //         let durations = [
    //             { name: "1 tick", dur: 1 },
    //             { name: "3 ticks", dur: 3 },
    //             { name: "6 ticks", dur: 6 },
    //             // { name: "12 ticks", dur: 12 },
    //             { name: "1 minute", dur: timing.m(1) },
    //             { name: "1 hour", dur: timing.h(1) },
    //             { name: "1 day", dur: timing.h(24) },
    //         ];
    //         for (let duration of durations) {
    //             let intent = {
    //                 representation: [
    //                     game.word("wait"),
    //                     game.word(duration.name),
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
exports.loadMod = loadMod;
module.exports = { loadMod: loadMod };


/***/ }),

/***/ "./src/modFighting.ts":
/*!****************************!*\
  !*** ./src/modFighting.ts ***!
  \****************************/
/***/ (function(__unused_webpack_module, exports) {


var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
function makeDevil() {
    return { name: "devil", actor: { intent: null } };
}
function loadMod(game) {
    var player = game.entities.filter(function (e) { return e.player; })[0];
    var area = game.entities.filter(function (e) { return e.area; })[0];
    game.actions.newLine = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return (_a = game.newLine).call.apply(_a, __spreadArrays([game], args));
    };
    console.log("loading mod fight");
    var devil = game.addEntity(makeDevil(), area);
    game.addEntity({ quality: { name: "Health", value: 10, pyramid: false } }, devil, "quality");
    game.addEntity({ quality: { name: "Power", value: 6, pyramid: false } }, devil, "quality");
    // game.addEntity(
    //     { quality: { name: "addPower", value: 4, pyramid: false } },
    //     devil,
    //     "quality"
    // );
    // game.addEntity(
    //     { quality: { name: "mulPower", value: 4, pyramid: false } },
    //     devil,
    //     "quality"
    // );
    var knife = game.addEntity({ name: "knife" }, devil, "activeItem");
    game.addEntity({ quality: { name: "addPower", value: 4, pyramid: false } }, knife, "quality");
    // devils with no intent will do a 6-tick dance
    game.addHandler(0, {
        on_getIntents: function () {
            for (var _i = 0, _a = game
                .intentless()
                .filter(function (d) { return d.name === "devil"; }); _i < _a.length; _i++) {
                var devil_1 = _a[_i];
                console.log("setting intent for devil");
                if (Math.random() < 1) {
                    // get target
                    var target = game.entities.filter(function (p) { return p.player; })[0];
                    // get damage
                    var damage = game.getTotalQuality(devil_1.id, "Power");
                    // strike
                    devil_1.actor.intent = {
                        sequence: [
                            {
                                duration: 2,
                                processText: "The devil is preparing to strike...",
                            },
                            {
                                func: "newLine",
                                args: [
                                    "The devil strikes you for " + damage + " damage!",
                                ],
                            },
                        ],
                    };
                }
                else {
                    // dodge
                    devil_1.actor.intent = {
                        sequence: [
                            {
                                func: "newLine",
                                args: ["The devil dodges."],
                            },
                            {
                                duration: 6,
                                processText: "The devil is dodging...",
                            },
                        ],
                    };
                }
            }
        },
    });
}
exports.loadMod = loadMod;


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
var debugMod = __webpack_require__(/*! ./modDebug */ "./src/modDebug.ts");
var fightingMod = __webpack_require__(/*! ./modFighting */ "./src/modFighting.ts");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
var game = new GameModule.Game();
var player = new PlayerModule.Player();
game.player = player;
// load mods
var debug = false;
var areaA = game.addEntity({
    name: "room A",
    area: true,
});
var areaB = game.addEntity({
    name: "room B",
    area: true,
});
var areaC = game.addEntity({
    name: "room C",
    area: true,
});
game.addEntity({
    path: {
        from: areaA.id,
        to: areaB.id,
        distance: 10,
    },
});
game.addEntity({
    path: {
        from: areaB.id,
        to: areaC.id,
        distance: 20,
    },
});
game.addEntity({
    path: {
        from: areaC.id,
        to: areaB.id,
        distance: 4,
    },
});
game.addEntity(player, areaA);
game.addEntity({ quality: { name: "Health", value: 10, pyramid: false } }, player, "quality");
// teaRoomMod.loadMod(game);
debugMod.loadMod(game);
fightingMod.loadMod(game);
console.log(game.entities);
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
game.getPlayerIntent();
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