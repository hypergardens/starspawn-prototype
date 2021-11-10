// let utils = require("./utils")
// let timing = require("./timing");
import * as timing from "./timing";
import { Entity, Action, Event } from "./Interfaces";
import { PriorityQueue } from "./PriorityQueue";
import { Player } from "./PlayerModule";
import { LogItem } from "./LogItem";
import { node, RuntimeGlobals } from "webpack";

export class Game {
    id: number;
    logId: number;
    history: {
        [key: number]: Action;
    };
    log: {
        [key: number]: LogItem;
    };
    entities: Entity[];
    words: any;
    intentsReady: boolean;
    queue: any[];
    time: number;
    focus: any;
    player: Player;
    playRandomly: boolean;
    actions: any;
    handlers: PriorityQueue;
    queueSpliceI: number;

    constructor() {
        this.id = 0;
        this.entities = [];
        this.words = {};

        this.logId = 0;
        this.history = {};
        this.log = {};

        this.intentsReady = true;
        this.queue = []; // [Action*]
        this.queueSpliceI = 0;
        this.handlers = new PriorityQueue(); // {on_eventType:func()}
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

    addHandler(value: number, handler: any) {
        this.handlers.enqueue({ value, element: handler });
        return handler;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ENTITY LOOKUP
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    intentless() {
        return this.entities.filter((e) => e.actor && e.actor.intent === null);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // QUALITY
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    getTotalQuality(entityId: number, qualityName: string) {
        let acceptableLinks = ["activeItem", "attachment"];
        let game = this;
        function getQualitySubtree(
            entityId: number,
            baseQ = 0,
            addQ = 0,
            mulQ = 1
        ) {
            let entity = game.getById(entityId);
            // check qualities
            for (let quality of game
                .getChildren(entity)
                .filter((q) => q.quality)) {
                if (quality.quality.name === qualityName) {
                    baseQ = quality.quality.value;
                } else if (quality.quality.name === `add${qualityName}`) {
                    addQ += quality.quality.value;
                } else if (quality.quality.name === `mul${qualityName}`) {
                    mulQ *= quality.quality.value;
                }
            }
            for (let child of game.getChildren(entity)) {
                // if acceptable link
                if (acceptableLinks.indexOf(child.rel) != -1) {
                    let subtree = getQualitySubtree(
                        child.id,
                        baseQ,
                        addQ,
                        mulQ
                    );
                    baseQ = subtree.baseQ;
                    addQ += subtree.addQ;
                    mulQ *= subtree.mulQ;
                }
            }
            return {
                baseQ,
                addQ,
                mulQ,
            };
        }
        let pack = getQualitySubtree(entityId);
        let { baseQ, addQ, mulQ } = pack;
        console.log({ qualityName, baseQ, addQ, mulQ });
        return (baseQ + addQ) * mulQ;
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

    enqueue(action, splice = true) {
        if (!splice) {
            this.queue.push(action);
        } else {
            this.queue.splice(this.queueSpliceI, 0, action);
            this.queueSpliceI++;
        }
    }

    emitEvent(data: Event) {
        let responses = [];
        for (let handler of this.handlers.asArray()) {
            if (handler[`on_${data.type}`]) {
                responses.push(handler[`on_${data.type}`](data));
            }
        }
        console.log("emitting");
        console.log({ data });
        return responses;
    }

    queueEvent(data: Event) {
        this.enqueue({ events: [data] });
    }

    // called when action is first started
    processAction(action: Action, actor: Entity) {
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
    }

    updateLogItem(logId: number) {
        let playerId = this.entities.filter((e) => e.player)[0].id;
        // if no action at id, leave alone
        if (!this.history[logId]) {
            return;
        } else {
            // no log, has action
            let action = this.history[logId];
            // compute sticky and progressBar
            let sticky: boolean, progressBar: string;
            let inProgress = false;
            if (action.duration && action.duration >= 0) {
                inProgress = true;
                progressBar = `[${
                    "=".repeat(action.maxDuration - action.duration) +
                    "-".repeat(action.duration)
                }]`;
                sticky = true;
            } else {
                if (action.maxDuration > 0) {
                    progressBar = `[${"X".repeat(action.maxDuration)}]`;
                } else {
                    progressBar = ``;
                }
                sticky = false;
            }

            this.log[logId] = {
                id: logId,
                text:
                    inProgress && action.processText ? action.processText : "",
                sticky: sticky,
                progressBar: progressBar,
                alignLeft: playerId === action.actor,
            };
        }
    }

    updateLog() {
        // clear display
        let display = document.getElementById("display");
        display.innerText = "";
        for (let i = 0; i <= this.logId; i++) {
            this.updateLogItem(i);
            // update UI at i
            if (this.log[i]) {
                let logItem = this.log[i];
                let node = document.createElement("div");
                node.id = `logItem${logItem.id}`;
                node.innerText += "\n" + logItem.text;
                node.innerText += "\n" + logItem.progressBar;
                node.style.textAlign = logItem.alignLeft ? "left" : "right";
                display.appendChild(node);
                display.scrollTop = display.scrollHeight;
            }
        }
    }

    newLine(text: string): LogItem {
        this.logId += 1;
        let logItem = {
            text: `${text}`,
            id: this.logId,
            alignLeft: true,
            sticky: false,
            progressBar: "",
        };
        this.log[this.logId] = logItem;
        return logItem;
    }

    getPlayerIntent() {
        if (this.player) {
            if (!this.player.actor.intent) {
                // lay out options if necessary
                if (!this.player.picking) {
                    this.player.picking = true;
                    this.player.setOptionsUI();
                }
                if (this.playRandomly) {
                    // pick random word and call this function again
                    setTimeout(() => {
                        let options = this.player.getNextWords();
                        // avoid cancelling actions if not on first word
                        if (this.player.command.length > 0) {
                            this.player.pickNextWord(
                                Math.floor(Math.random() * (options.length - 1))
                            );
                        } else {
                            // pick any first word
                            this.player.pickNextWord(
                                Math.floor(Math.random() * options.length)
                            );
                        }
                        this.getPlayerIntent();
                    }, 100);
                } else {
                    // hang for manual pick
                    setTimeout(() => {
                        this.getPlayerIntent();
                    }, 100);
                }
            } else {
                // player intent done, move on to NPCs
                this.getNPCIntents();
            }
        }
    }
    getNPCIntents() {
        this.emitEvent({ type: "getIntents" });
        this.processIntents();
    }
    processIntents() {
        // get this tick's Actions {aedpcs} for every entity with intent (null or Intent)
        this.intentsReady = true;
        for (let entity of this.entities.filter((e) => e.actor)) {
            let intent = entity.actor.intent;
            // empty intent
            if (!intent) {
                this.intentsReady = false;
                throw `entity without intent ${entity.name}`;
                // hang and reset for player input
            } else if (intent && intent.sequence.length > 0) {
                // extract actions and enqueue them
                let ticks = 0;

                // extract actions until we go over 1 tick
                while (ticks === 0 && intent.sequence.length > 0) {
                    // process and enqueue action
                    intent.sequence[0] = this.processAction(
                        intent.sequence[0],
                        entity
                    );
                    let action = intent.sequence[0];
                    this.enqueue(action, false);
                    // // propagate events
                    // if (action.events) {
                    //     for (let event of action.events) {
                    //         this.queueEvent(event);
                    //     }
                    // }

                    // queue up actions including the first with duration
                    if (action.duration <= 0 || action.duration === undefined) {
                        // instant action, keep queueSplicing
                        intent.sequence.splice(0, 1);
                    } else if (action.duration <= 1) {
                        // end actions here
                        intent.sequence.splice(0, 1);
                        action.duration -= 1;
                        ticks = action.duration;
                    } else {
                        // action that will be taken multiple times
                        action.duration -= 1;
                        ticks = action.duration;
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
    }

    processNext() {
        // get next action to execute
        if (this.queue.length > 0) {
            this.queueSpliceI = 0;
            let action = this.queue.shift();
            // func: execute command
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
            // events: propagate events
            if (action.events && action.events.length > 0) {
                for (let event of action.events) {
                    // new event to propagate
                    let type = event.type;
                    // send to every handler
                    let responses = this.emitEvent(event);
                    // TODO: blocking and response collection
                    false && console.log({ event, i: this.queueSpliceI });
                    false && console.log({ responses });
                }
            }
            // pause: execute the next instantly or with pause

            this.updateUI();
            if (action.pause) {
                setTimeout(() => {
                    this.processNext();
                }, action.pause);
            } else {
                this.processNext();
            }
        } else {
            // loop again
            this.time += 1;
            this.getPlayerIntent();
        }
    }

    word(text) {
        if (!this.words[text]) {
            let word = { type: "word", name: text };
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
        function indentedSubtree(entity: Entity, depth = 0) {
            if ((!entity.name && !entity.quality) || entity.invisible)
                return null;

            // base text and focus
            let text = "";
            let focusedText =
                game.player.focus === entity.id ? "(focused)" : "";

            // object or quality
            if (entity.quality) {
                text = `Q: ${entity.quality.name} ${entity.quality.value}`;
            } else if (entity.name) {
                text = `${entity.name}`;
            }

            // assemble text chunk
            let textNode = document.createElement("a");
            textNode.innerText = `|${"----".repeat(
                depth
            )} ${text} ${focusedText}\n`;

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
                    if (game.player.focus === entity.id) {
                        game.player.focus = null;
                    } else {
                        game.player.focus = entity.id;
                    }
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
