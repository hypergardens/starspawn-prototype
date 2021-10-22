export function newLine(text): void {
    // var node = document.createElement("li"); // Create a <li> node
    // var textnode = document.createTextNode(text); // Create a text node
    // node.appendChild(textnode); // Append the text to <li>
    let display = document.getElementById("display");
    display.innerText += "\n" + text;
    display.scrollTop = display.scrollHeight;
}
