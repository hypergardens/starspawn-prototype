export class LogItem {
    text: string;

    constructor(text) {
        this.text = text;
    }

    toHtmlElement() {
        let div = document.createElement("div");
        div.appendChild(document.createTextNode(this.text));
        div.appendChild(div);
    }
}
