/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/GameModule.ts":
/*!***************************!*\
  !*** ./src/GameModule.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var timing = __webpack_require__(/*! ./timing */ "./src/timing.ts");
var Game = /** @class */ (function () {
    function Game() {
        this.id = 0;
        this.entities = [];
        this.words = {};
        this.intentsReady = true;
        this.signalsReady = true;
        this.queue = []; // [Action*]
        this.receivers = []; // {on_signalType:func()}
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
        var accessible = !parent.closed && !parent.locked;
        return accessible && this.isAccessible(parent);
    };
    Game.prototype.enqueue = function (action, i) {
        if (i === void 0) { i = -1; }
        if (i === -1) {
            this.queue.push(action);
        }
        else {
            this.queue.splice(i, 0, action);
        }
    };
    Game.prototype.emitSignal = function (data) {
        for (var _i = 0, _a = this.receivers; _i < _a.length; _i++) {
            var receiver = _a[_i];
            if (receiver["on_" + data.type]) {
                receiver["on_" + data.type](data);
            }
        }
    };
    Game.prototype.getIntents = function () {
        var _this = this;
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.queue = [];
        this.intentsReady = true;
        var _loop_1 = function (entity) {
            var sequence = entity.sequence;
            // console.log({ sequence })
            // empty intent
            if (!sequence || (sequence && sequence.length === 0)) {
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
                    }, 1);
                }
            }
            else if (sequence.length > 0) {
                // extract actions and enqueue them
                var ticks = 0;
                var i = 0;
                // extract actions until we go over 1 tick
                while (ticks === 0 && i < sequence.length) {
                    var action = sequence[i];
                    this_1.enqueue(action);
                    // console.log(`queued up`, action);
                    // queue up actions including the first with duration
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueing
                        sequence.splice(i, 1);
                    }
                    else if (action.duration > 0) {
                        // action that will be taken multiple times
                        ticks = action.duration;
                        // end actions here
                        if (action.duration <= 1) {
                            sequence.splice(i, 1);
                        }
                        // console.log(`action with ${ticks} duration`, action);
                        // TODO: make multiple intent declarations possible per tick?
                        action.duration -= 1;
                    }
                    else {
                        // throw `Not sure what this means`;
                    }
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = this.entities.filter(function (e) { return e.sequence; }); _i < _a.length; _i++) {
            var entity = _a[_i];
            _loop_1(entity);
        }
        // when ready, propagate signals
        if (this.intentsReady) {
            // queue up a tick signal
            this.queue.push({ signals: [{ type: "tick" }] });
            // newLine(`starting tick ${game.time}`);
            this.propagateSignals();
        }
    };
    Game.prototype.propagateSignals = function () {
        // run through signal propagation and clearing, instant
        this.signalsReady = false;
        while (!this.signalsReady) {
            this.signalsReady = true;
            // for every unpropagated action with signals, propagate and clear signals
            for (var _i = 0, _a = this.queue.filter(function (a) { return !a.propagated && a.signals && a.signals.length > 0; }); _i < _a.length; _i++) {
                var action = _a[_i];
                for (var _b = 0, _c = action.signals; _b < _c.length; _b++) {
                    var signal = _c[_b];
                    // new signal to propagate
                    this.signalsReady = false;
                    var type = signal.type;
                    // send to every receiver
                    for (var _d = 0, _e = this.receivers; _d < _e.length; _d++) {
                        var receiver = _e[_d];
                        if (receiver["on_" + type]) {
                            receiver["on_" + type](signal);
                        }
                    }
                }
                // mark as propagated
                action.propagated = true;
            }
        }
        // reset propagation for actions with duration
        for (var _f = 0, _g = this.queue.filter(function (a) { return a.propagated === true; }); _f < _g.length; _f++) {
            var action = _g[_f];
            action.propagated = false;
        }
        this.executeNext();
    };
    Game.prototype.executeNext = function () {
        var _this = this;
        // get next action to execute
        if (this.queue.length > 0) {
            var action = this.queue.shift();
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
            // execute the next instantly or with pause
            if (action.pause) {
                setTimeout(function () {
                    _this.executeNext();
                }, action.pause);
            }
            else {
                this.executeNext();
            }
        }
        else {
            // loop again
            this.time += 1;
            this.updateUI();
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
        this.intent = null; // intent
        this.sequence = [];
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
                this.sequence = intent.sequence;
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

/***/ "./src/modTeaRoom.ts":
/*!***************************!*\
  !*** ./src/modTeaRoom.ts ***!
  \***************************/
/***/ ((module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var utils = __webpack_require__(/*! ./utils */ "./src/utils.ts");
var timing = __webpack_require__(/*! ./timing */ "./src/timing.ts");
var newLine = utils.newLine;
function loadMod(player, game) {
    game.actions.newLine = utils.newLine;
    game.actions.wait = function (ticks) {
        if (ticks === void 0) { ticks = 0; }
        game.actions.newLine("Still waiting... of " + ticks);
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
            pause: timing.mpt / Math.pow(ticks, 1),
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
        }, fluidContainer);
        newLine("You fill up the " + fluidContainer.baseName + " from the " + fluidSource.baseName + " with " + fluid.baseName);
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
                            createWaitAction(3),
                            {
                                func: "fillFrom",
                                args: [
                                    fluidSource.id,
                                    nonEmptyFluidContainer.id,
                                ],
                                duration: 1,
                            },
                            createWaitAction(3),
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
        newLine("You empty the " + container.baseName + " on the " + containerParent.baseName + ".");
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
            newLine("You pour the " + child.baseName + " from the " + source.baseName + " into the " + destination.baseName + ".");
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
        if (trialPassword === chest.lockedContainer.password) {
            chest.locked = false;
            newLine("The locks click open.");
        }
        else {
            newLine("Incorrect password.");
        }
    };
    player.addPattern({
        intents: function () {
            var intents = [];
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.lockedContainer && e.locked && game.isAccessible(e); }); _i < _a.length; _i++) {
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
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.note; }); _i < _a.length; _i++) {
                var entity = _a[_i];
                // the sequence
                intents.push({
                    representation: [game.word("read"), entity],
                    sequence: [
                        createNewLineAction("You read the note..."),
                        createNewLineAction("" + entity.note.content),
                    ],
                });
            }
            return intents;
        },
    });
    game.actions.tryOpen = function (entityId) {
        var entity = game.getById(entityId);
        if (entity.locked) {
            newLine("The " + entity.baseName + " seems to be locked...");
        }
        else {
            entity.closed = false;
            newLine("You open the " + entity.baseName);
            newLine("It contains: " + game
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
        newLine("You punch the " + target.baseName + "! " + sounds[Math.floor(Math.random() * sounds.length)]);
        if (target.health < 5) {
            newLine("Some fluff flies out of the ruptures. 1 damage!");
            target.health -= 1;
            game.emitSignal({ type: "damageDealt", by: attacker, to: target });
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
                newLine("You feel like a 400 IQ, cupboard-opening, killing machine! In fact, you feel so good you feel like giving Gardens some feedback on their game!");
            }
            else if (fluid.tea) {
                newLine("It's not too bad. It's... fine.");
            }
            else {
                newLine("It's important to stay hydrated, I guess.");
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
            newLine("You let out a piercing shriek as you ready your razor-sharp, glassy claws!");
        else
            newLine("You ready your claws again!");
    };
    game.actions.claw = function (attackerId, targetId) {
        var attacker = game.getById(attackerId);
        var target = game.getById(targetId);
        newLine("You tear out the " + target.baseName + "'s insides for 2 damage!");
        target.health -= 2;
        game.emitSignal({
            type: "damageDealt",
            by: player,
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
    game.receivers.push({
        on_damageDealt: function (data) {
            newLine("Damage dealt by " + data.by.baseName);
            if (data.to.health <= 0 && !data.to.dead) {
                data.to.dead = true;
                newLine("You have defeated your first enemy, a vile " + data.to.baseName + ". It drops a teabag!");
                data.to.baseName = "dead " + data.to.baseName;
                data.health = undefined;
                game.addEntity({
                    baseName: "VICTORIOUS teabag",
                    item: true,
                    flammable: true,
                    infusable: true,
                    flavour: "VICTORY",
                }, game.getParent(data.to));
            }
        },
    });
    game.receivers.push({
        on_tick: function (data) {
            var _loop_1 = function (stove) {
                if (stove.active) {
                    stove.ctr += 1;
                    // put out a message regularly
                    if (stove.ctr >= 20) {
                        stove.ctr = 0;
                        newLine("The stove's flame burns a warm orange.");
                    }
                    var _loop_2 = function (containerOnStove) {
                        // newLine(`The stove heats up the ${containerOnStove.baseName}`)
                        for (var _i = 0, _a = game.entities.filter(function (fluid) {
                            return fluid.fluid &&
                                game.isParent(containerOnStove, fluid);
                        }); _i < _a.length; _i++) {
                            var fluid = _a[_i];
                            // newLine(`The stove heats up the ${fluid.baseName} in the ${containerOnStove.baseName}`);
                            fluid.temperature += 1;
                            if (fluid.temperature == 23) {
                                newLine("The " + containerOnStove.baseName + " is filled with hot " + fluid.baseName + "!");
                            }
                        }
                    };
                    // heat up fluid inside containers on stove
                    for (var _i = 0, _a = game.entities.filter(function (containerOnStove) {
                        return containerOnStove.fluidContainer &&
                            game.isParent(stove, containerOnStove);
                    }); _i < _a.length; _i++) {
                        var containerOnStove = _a[_i];
                        _loop_2(containerOnStove);
                    }
                }
            };
            for (var _i = 0, _a = game.entities.filter(function (e) { return e.baseName === "stove"; }); _i < _a.length; _i++) {
                var stove = _a[_i];
                _loop_1(stove);
            }
        },
    });
    game.receivers.push({
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
                        prefix += infusingTeabag.flavour + " ";
                        game.emitSignal({ type: "teaMade" });
                        if (count < 3) {
                            hotFluid.baseName = prefix + " tea";
                            hotFluid.tea = true;
                        }
                        else {
                            hotFluid.baseName = "TURBO TESTER TEA";
                            if (!hotFluid.turboTea) {
                                hotFluid.turboTea = true;
                                newLine("TOTAL VICTORY ACHIEVED! Enjoy your tea!");
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
        type: "winBehaviourState",
        baseName: "winBehaviourState",
        won: false,
        invisible: true,
        uberWon: false,
    });
    game.receivers.push({
        on_teaMade: function (data) {
            var state = game.entities.filter(function (e) { return e.type === "winBehaviourState"; })[0];
            if (state.won === false) {
                newLine("Congratulations, you have made tea! Did you find all three teabags? I wonder what happens if you infuse them all at once...");
                state.won = true;
            }
        },
    });
    game.addEntity({
        baseName: "timer",
        type: "timer",
        invisible: true,
        time: -1,
    });
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
exports.mpt = 5;


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    var display = document.getElementById("display");
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}
exports.newLine = newLine;


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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
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
var utils = __webpack_require__(/*! ./utils */ "./src/utils.ts");
var GameModule = __webpack_require__(/*! ./GameModule */ "./src/GameModule.ts");
var PlayerModule = __webpack_require__(/*! ./PlayerModule */ "./src/PlayerModule.ts");
// HACK
// let newLine = utils.newLine;
// import { newLine } from "./utils";
utils.newLine("Test");
var game = new GameModule.Game();
var player = new PlayerModule.Player();
game.player = player;
// load mods
var teaRoomMod = __webpack_require__(/*! ./modTeaRoom */ "./src/modTeaRoom.ts");
teaRoomMod.loadMod(player, game);
// let debugMod = require("./modDebug");
// debugMod.loadMod(player, game);
var debug = false;
var area = game.addEntity({
    teaRoom: true,
    baseName: "tea room",
    area: true,
    dummy: { blorp: 5 },
});
game.addEntity(player, area);
var stove = game.addEntity({
    baseName: "stove",
    active: false,
    surface: true,
    messageCounter: {
        messages: [
            "The stove's flame burns a warm orange.",
            "The stove's flame crackles",
        ],
        ctr: 0,
        ctrMax: 20,
    },
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
    solidContainer: {
        open: false,
    },
}, area);
var cranberryTeabag = game.addEntity({
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
    solidContainer: { open: false },
    item: true,
    locked: { password: "6" },
}, table, "on");
var smallerChest = game.addEntity({
    baseName: "smaller chest",
    solidContainer: { open: false },
    item: true,
}, lockedChest, "in");
var evenSmallerChest = game.addEntity({
    baseName: "even smaller chest",
    solidContainer: { open: false },
    item: true,
}, smallerChest, "in");
var secretTeabag = game.addEntity({
    baseName: "secretive teabag",
    item: true,
    infusable: { flavour: "SECRET" },
}, smallerChest, "in");
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