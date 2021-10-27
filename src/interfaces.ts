export interface Entity {
    id?: number;
    parent?: number;
    baseName?: string;
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

export interface Signal {
    type: string;

    // DamageDealt
    by?: Entity;
    to?: Entity;
    amount?: number;
}

// export interface FluidSource extends Entity {
//     fluidSource: string;
// }

// let test = <FluidSource>{ id: 5 };
// interface Entity {
//     id: number;
//     parent: number;
// }

// interface Enemy {
//     health: number;
// }

// let jug = {
//     id: 1,
//     parent: 0,
//     baseName: "jug",
//     fluidContainer: true,
// };

// let goblin = {
//     id: 2,
//     parent: 0,
//     baseName: "goblin",
//     health: 5,
// };

// let goblinJug = {
//     id: 3,
//     parent: 0,
//     baseName: "goblinJug",
//     health: 6,
//     fluidContainer: true,
// };

/// game logic that figures out the IDs [2, 3], for each call this function:

// function doSomethingToEnemy(id: number) {
//     let enemy: Enemy = game.getEntityById(id);
//     enemy.health += 1;
// }

// TypeScript is structurally typed - so all these pass as entity
// doSomethingOnEntity(goblinJug);
