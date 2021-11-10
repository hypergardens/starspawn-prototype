export interface Entity {
    id?: number;
    parent?: number;
    name?: string;
    rel?: string;
    // [key: string]: any;

    area?: boolean;

    fluidSource?: string;
    active?: boolean;

    locked?: {
        password: string;
        isLocked: boolean;
    };

    closed?: boolean;

    fluidContainer?: boolean;
    solidContainer?: boolean;

    surface?: boolean;
    fluid?: boolean;
    item?: boolean;
    invisible?: boolean;

    health?: number;

    infusable?: {
        flavour: string;
    };

    timer?: { time: number };

    winBehaviorState?: { won: boolean; uberWon: boolean };

    temperature?: number;
    readable?: { message: string };

    turboTea?: boolean;
    tea?: boolean;

    ctr?: number;
    // quality
    quality?: {
        name: string;
        value: any;
        pyramid: boolean;
    };

    // path
    path?: {
        from: number;
        to: number;
        distance: number;
    };

    actor?: {
        intent: {
            representation?: Entity[];
            sequence: Action[];
        };
    };
    // PLAYER
    setOptionsUI?: any;
    getNextWords?: any;
    pickNextWord?: any;
    picking?: boolean;
    sequence?: any[];
    command?: any[];
    patterns?: any[];
    focus?: number;
    player?: boolean;
}

export interface Event {
    type: string;

    from?: Entity;
    to?: Entity;
    // DamageDealt
    damage?: number;
}

export interface Action {
    func?: string;
    args?: any[];
    duration?: number;
    pause?: number;
    events?: Event[];
    tags?: any;
    processText?: string;
    // computed
    actor?: number;
    id?: number;
    maxDuration?: number;
}

export interface LogItem {
    id?: number;
    text?: string;
}
