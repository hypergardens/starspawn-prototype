import { TextNode } from "./TextNode";

export interface LogItem {
    textNodes: TextNode[];
    alignLeft: boolean;
    id: number;
    progressBar?: string;
    sticky: boolean;
}
