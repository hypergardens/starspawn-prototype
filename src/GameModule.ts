// let utils = require("./utils")
// let timing = require("./timing");
import * as timing from "./timing";
import { Entity, Action, Signal } from "./Interfaces";

import { Player } from "./PlayerModule";
import { LogItem } from "./LogItem";

export class Game {
    id: number;
    actionId: number;
    history: Action[];
    log: any[];
    entities: Entity[];
    words: any;
    intentsReady: boolean;
    signalsReady: boolean;
    queue: any[];
    receivers: any[];
    time: number;
    focus: any;
    player: any;
    playRandomly: boolean;
    actions: any;

    constructor() {
        this.id = 0;
        this.entities = [];
        this.words = {};

        this.actionId = 0;
        this.history = [];
        this.log = [];

        this.intentsReady = true;
        this.signalsReady = true;
        this.queue = []; // [Action*]
        this.receivers = []; // {on_signalType:func()}
        this.time = 0;
        this.player = null;
        this.playRandomly = false;
        this.actions = {};
    }

    addEntity(
        entity: Entity,
        parentEntity: Entity = null,
        rel: string = null
    ): Entity {
        this.entities.push(entity);
        entity.id = this.id;
        this.id += 1;
        if (parentEntity !== null) {
            this.setParent(parentEntity, entity, rel);
        }
        return entity;
    }

    getById(id: number): Entity {
        let found = undefined;
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].id === id) {
                found = this.entities[i];
            }
        }
        if (found === undefined) throw `object not found with id ${id}`;
        return found;
    }

    getDepth(entity: Entity) {
        let depth = 0;
        while (this.getParent(entity) !== undefined) {
            entity = this.getParent(entity);
            depth += 1;
        }
        return depth;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // PARENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    setParent(parentEntity: Entity, childEntity: Entity, rel: string = null) {
        if (
            parentEntity === undefined ||
            parentEntity.id === undefined ||
            this.getById(parentEntity.id) === undefined
        )
            throw "Undefined parent.";
        this.unsetParent(childEntity);
        childEntity.parent = parentEntity.id;
        if (rel !== null) {
            childEntity.rel = rel;
        }
    }

    setParentById(parentId, childId, rel = null) {
        this.setParent(this.getById(parentId), this.getById(childId), rel);
    }

    unsetParent(childEntity: Entity) {
        childEntity.parent = undefined;
    }

    isParent(parentEntity: Entity, childEntity: Entity) {
        return parentEntity.id === childEntity.parent;
    }

    getParent(childEntity: Entity) {
        let parent =
            childEntity.parent === undefined
                ? undefined
                : this.getById(childEntity.parent);
        return parent;
    }

    getChildren(entity: Entity) {
        // console.log("loop", entity.id);
        let contents = this.entities.filter((e) => e.parent === entity.id);
        // let contents = this.entities.filter((e) => this.isParent(entity, e));
        return contents;
    }

    getChildrenById(id: number) {
        return this.getChildren(this.getById(id));
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    deleteById(id) {
        // TODO? throw if not found
        this.entities = this.entities.filter((e) => e.id !== id);
    }

    isAccessible(entity) {
        if (entity === undefined || this.getParent(entity) === undefined)
            return true;
        let parent = this.getParent(entity);
        let accessible =
            (parent.closed === false || parent.closed === undefined) &&
            (parent.locked === undefined || parent.locked.isLocked === false);
        return accessible && this.isAccessible(parent);
    }

    enqueue(action, i = -1) {
        if (i === -1) {
            this.queue.push(action);
        } else {
            this.queue.splice(i, 0, action);
        }
    }

    emitSignal(data: Signal) {
        for (let receiver of this.receivers) {
            if (receiver[`on_${data.type}`]) {
                receiver[`on_${data.type}`](data);
            }
        }
    }

    processAction(action: Action) {
        if (action.maxDuration === undefined) {
            action.maxDuration = action.duration || 0;
            this.actionId += 1;
            action.id = this.actionId;

            let logItem = {
                id: action.id,
            };

            this.history.push(action);
            this.log.push(logItem);
        }

        return action;
    }

    updateLog() {
        for (let i = 0; i < this.log.length; i++) {
            let logItem = this.log[i];
            let logId = logItem.id;
            for (let hc = 0; hc < this.history.length; hc++) {
                let action = this.history[hc];
                let actionId = action.id;
                // match log item to action
                if (logId === actionId) {
                    if (action.duration && action.duration > 0) {
                        logItem.progressBar = `[${"=".repeat(
                            action.duration
                        )}]`;
                        logItem.sticky = true;
                    } else {
                        logItem.progressBar = "";
                        logItem.sticky = false;
                    }
                }
            }
        }
        this.log.sort((a, b) => (a.sticky && !b.sticky ? 1 : 0));

        // update UI
        let display = document.getElementById("display");
        display.innerText = "";
        let i = Math.max(0, this.log.length - 50);
        for (let logItem of this.log.slice(i)) {
            if (logItem.text) {
                display.innerText += "\n" + logItem.text;
            }
            if (logItem.progressBar) {
                display.innerText += "\n" + logItem.progressBar;
            }
        }
        display.scrollTop = display.scrollHeight;
        console.log(this.log);
    }

    newLine(text) {
        this.actionId += 1;
        let logItem = {
            text: `${text}`,
            id: this.actionId,
        };
        this.log.push(logItem);
    }

    getIntents() {
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.queue = [];
        this.intentsReady = true;
        for (let entity of this.entities.filter((e) => e.actor)) {
            let intent = entity.actor.intent;
            // empty intent
            if (!intent) {
                this.intentsReady = false;
                // hang and reset for player input
                if (entity.player) {
                    if (!entity.picking) {
                        entity.picking = true;
                        entity.setOptionsUI();
                    }
                    setTimeout(() => {
                        let options = entity.getNextWords();
                        if (this.playRandomly) {
                            if (entity.command.length > 0) {
                                entity.pickNextWord(
                                    Math.floor(
                                        Math.random() * (options.length - 1)
                                    )
                                );
                            } else {
                                entity.pickNextWord(
                                    Math.floor(Math.random() * options.length)
                                );
                            }
                        }
                        this.getIntents();
                    }, 100);
                }
            } else if (intent && intent.sequence.length > 0) {
                // extract actions and enqueue them
                let ticks = 0;

                // extract actions until we go over 1 tick
                while (ticks === 0 && intent.sequence.length > 0) {
                    // process and enqueue action
                    intent.sequence[0] = this.processAction(intent.sequence[0]);
                    let action = intent.sequence[0];
                    this.enqueue(action);

                    // queue up actions including the first with duration
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueing
                        intent.sequence.splice(0, 1);
                    } else if (action.duration > 0) {
                        // action that will be taken multiple times
                        ticks = action.duration;
                        // end actions here
                        if (action.duration <= 1) {
                            intent.sequence.splice(0, 1);
                        }
                        action.duration -= 1;
                        // this.newLine(
                        //     `${action.duration}/${action.maxDuration}`
                        // );
                    } else {
                        // throw `Not sure what this means`;
                    }
                }
                if (intent.sequence.length === 0) {
                    entity.actor.intent = null;
                }
            }
        }
        // when ready, propagate signals
        if (this.intentsReady) {
            // queue up a tick signal
            this.queue.push({ signals: [{ type: "tick" }] });
            // newLine(`starting tick ${game.time}`);
            this.propagateSignals();
        }
    }

    propagateSignals() {
        // run through signal propagation and clearing, instant
        this.signalsReady = false;
        while (!this.signalsReady) {
            this.signalsReady = true;
            // for every unpropagated action with signals, propagate and clear signals
            for (let action of this.queue.filter(
                (a) => !a.propagated && a.signals && a.signals.length > 0
            )) {
                for (let signal of action.signals) {
                    // new signal to propagate
                    this.signalsReady = false;
                    let type = signal.type;
                    // send to every receiver
                    for (let receiver of this.receivers) {
                        if (receiver[`on_${type}`]) {
                            receiver[`on_${type}`](signal);
                        }
                    }
                }
                // mark as propagated
                action.propagated = true;
            }
        }
        // reset propagation for actions with duration
        for (let action of this.queue.filter((a) => a.propagated === true)) {
            action.propagated = false;
        }

        this.executeNext();
    }

    executeNext() {
        // get next action to execute
        if (this.queue.length > 0) {
            let action = this.queue.shift();
            if (action.func) {
                if (this.actions[action.func]) {
                    let func = this.actions[action.func];
                    if (action.args) {
                        func(...action.args);
                    } else {
                        func();
                    }
                } else {
                    throw `Unknown action ${action.func}, args ${action.args}`;
                }
            }
            // execute the next instantly or with pause
            if (action.pause) {
                setTimeout(() => {
                    this.executeNext();
                }, action.pause);
            } else {
                this.executeNext();
            }
        } else {
            // loop again
            this.time += 1;
            this.updateUI();
            this.getIntents();
        }
    }

    word(text) {
        if (!this.words[text]) {
            let word = { type: "word", baseName: text };
            this.words[text] = word;
        }
        return this.words[text];
    }

    updateUI() {
        this.updateEntityTreeUI();
        this.updateClockUI();
        this.updateLog();
    }

    updateEntityTreeUI() {
        // time
        let ticks = this.time % timing.tps;
        let hours = Math.floor(this.time / timing.tps / 3600);
        let minutes = Math.floor(this.time / timing.tps / 60);
        let seconds = Math.floor(this.time / timing.tps);
        let game = this;
        let treeNode = document.getElementById("entityTree");
        treeNode.innerHTML = `Time: ${hours}:${minutes}:${seconds}:${ticks}\n\n</br>`;

        // subtree
        function indentedSubtree(entity, depth = 0) {
            if (!entity.baseName || entity.invisible) return null;
            let healthText =
                entity.health > 0 ? `[${"#".repeat(entity.health)}]` : "";

            let focusedText =
                game.player.focus === entity.id ? "(focused)" : "";
            let textNode = document.createElement("a");
            // textNode.style.color = "lightgrey";
            textNode.innerText = `|${"----".repeat(depth)}${
                entity.baseName
            } ${healthText}${focusedText}\n`;
            textNode.className = "treeObject";
            if (game.getChildren(entity).length > 0) {
                for (let child of game
                    .getChildren(entity)
                    .filter((e) => game.isAccessible(e))) {
                    let subtree = indentedSubtree(child, depth + 1);
                    if (subtree !== null) textNode.appendChild(subtree);
                }
            }

            // on click, focus action
            textNode.addEventListener("click", function (e) {
                e = <MouseEvent>window.event || e;
                if (this === e.target) {
                    game.player.focus = entity.id;
                    game.player.command = [];
                    game.player.setOptionsUI();
                }
                game.updateEntityTreeUI();
            });

            return textNode;
        }

        for (let entity of this.entities.filter(
            (e) => this.getDepth(e) === 0
        )) {
            let subtree = indentedSubtree(entity, 0);
            if (subtree) {
                treeNode.appendChild(subtree);
            }
        }
    }

    updateClockUI() {
        let clock = <HTMLCanvasElement>document.getElementById("clock");
        let ctx = clock.getContext("2d");
        let width = clock.clientWidth;
        let height = clock.clientHeight;
        // ctx.stroke = "white";
        ctx.clearRect(0, 0, width, height);
        ctx.fillText(`${this.time}`, width / 2 - 6, height / 2 + 5);

        // dots
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.rotate(-Math.PI / 2);
        for (let i = 0; i < 12; i++) {
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
    }
}

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
