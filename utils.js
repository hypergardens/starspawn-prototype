function isParent(parentEntity, child) {
    return child.parent === parentEntity.id;
}

function setParent(parentEntity, child) {
    if (parentEntity === undefined || parentEntity.id === undefined) throw "Undefined parent."
    child.parent = parentEntity.id;
}

function unsetParent(child) {
    child.parent = undefined;
}

module.exports = { isParent, setParent, unsetParent };