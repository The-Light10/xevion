const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
export class Renderer {
    asciiOnly;
    constructor(asciiOnly = false) {
        this.asciiOnly = asciiOnly;
    }
    paint(color, text) {
        return this.asciiOnly ? text : `${color}${text}${RESET}`;
    }
    mark(symbol, fallback) {
        return this.asciiOnly ? fallback : symbol;
    }
    header(model, provider, local, cost) {
        const sep = this.mark("·", "-");
        const tag = local ? `[locale ${sep} gratis]` : `[cloud ${sep} $${cost.toFixed(4)}]`;
        const line = `${this.paint(BOLD + CYAN, "xevion")} ${this.paint(DIM, `${provider}/${model}`)} ${this.paint(YELLOW, tag)}`;
        return process.stdout.isTTY ? line : line.replace(/\x1b\[[0-9;]*m/g, "");
    }
    event(event) {
        switch (event.type) {
            case "text":
                return event.text;
            case "tool":
                if (event.status === "start") {
                    return this.paint(DIM, `${this.mark("›", ">")} ${event.name} ${event.detail ?? ""}`);
                }
                return event.ok
                    ? this.paint(GREEN, `${this.mark("✔", "[OK]")} ${event.name}`)
                    : `${this.paint(RED, `${this.mark("✖", "[X]")} ${event.name}`)} ${event.detail ?? ""}`;
            case "info":
                return this.paint(DIM, `${this.mark("·", "-")} ${event.text}`);
            case "error":
                return this.paint(RED, `${this.mark("!", "!")} ${event.text}`);
            case "usage":
                return this.paint(DIM, `token ${event.inputTokens}/${event.outputTokens} ${this.mark("·", "-")} $${event.costUsd.toFixed(4)}`);
            case "done":
                return undefined;
        }
    }
    diff(text) {
        if (this.asciiOnly)
            return text;
        return text
            .split("\n")
            .map((line) => {
            if (line.startsWith("-"))
                return this.paint(RED, line);
            if (line.startsWith("+"))
                return this.paint(GREEN, line);
            if (line.startsWith("---") || line.startsWith("+++"))
                return this.paint(DIM, line);
            return line;
        })
            .join("\n");
    }
}
//# sourceMappingURL=render.js.map