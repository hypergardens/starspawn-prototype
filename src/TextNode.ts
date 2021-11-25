export interface TextNode {
    background: string;
    foreground: string;
    text: string;
}

export function createTextNode(
    text,
    background = null,
    foreground = null
): TextNode {
    return {
        text,
        background: background,
        foreground: foreground,
    };
}
