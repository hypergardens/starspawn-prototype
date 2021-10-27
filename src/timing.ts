// ticks per second
export let tps = 1;
// milliseconds per tick
export let mpt = 10;

export function s(nr) {
    return tps * nr;
}

export function m(nr) {
    return tps * nr * 60;
}
export function h(nr) {
    return tps * nr * 3600;
}
