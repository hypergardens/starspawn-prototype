function isSuperset(set, subset) {
    for (let elem of subset) {
        if (!set.has(elem)) {
            return false;
        }
    }
    return true;
}

function union(setA, ...sets) {
    let _union = new Set(setA);
    for (let setB of sets) {
        for (let elem of setB) {
            _union.add(elem);
        }
    }
    return _union;
}

function intersection(setA, ...sets) {
    let _intersection = new Set(setA);
    for (let setB of sets) {
        for (let elem of _intersection) {
            if (!setB.has(elem)) {
                _intersection.delete(elem);
            }
        }
    }
    return _intersection;
}

function difference(setA, ...sets) {
    let _difference = new Set(setA);
    for (let setB of sets) {
        for (let elem of setB) {
            _difference.delete(elem);
        }
    }
    return _difference;
}

module.exports = { isSuperset, union, intersection, difference };