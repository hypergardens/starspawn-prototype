// ticks per second
export let tps = 6;
// milliseconds per tick
export let mpt = 300;

export function s(nr) {
    return tps * nr;
}

export function m(nr) {
    return tps * nr * 60;
}
export function h(nr) {
    return tps * nr * 3600;
}
