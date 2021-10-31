interface PQElement {
    value: number;
    element: any;
}

export class PriorityQueue {
    list: PQElement[];
    constructor() {
        this.list = [];
    }
    enqueue(element: PQElement): PQElement {
        this.list.push(element);
        this.reorganise();
        return element;
    }
    reorganise() {
        this.list = this.list.sort((a, b) => a.value - b.value);
    }
    getAt(i: number): any {
        return this.list[i].element;
    }
    asArray() {
        return this.list.map((pqe) => pqe.element);
    }
}
