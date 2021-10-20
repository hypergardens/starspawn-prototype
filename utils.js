function setParent(parentEntity, child) {
    if (parentEntity === undefined || parentEntity.id === undefined) throw "Undefined parent."
    child.parent = parentEntity.id;
}

function unsetParent(child) {
    child.parent = undefined;
}

function newLine(text) {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById('display')
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}

module.exports = { setParent, unsetParent, newLine };