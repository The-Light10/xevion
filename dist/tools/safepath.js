import { isAbsolute, relative, resolve } from "node:path";
export function resolveInProject(cwd, target, allowOutside = false) {
    const absolute = resolve(cwd, target);
    if (allowOutside)
        return absolute;
    const rel = relative(cwd, absolute);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)))
        return absolute;
    throw new Error(`Percorso fuori dal progetto: ${target}`);
}
export function globToRegExp(pattern) {
    let source = "^";
    for (let i = 0; i < pattern.length; i += 1) {
        const ch = pattern[i];
        if (ch === "*") {
            if (pattern[i + 1] === "*") {
                source += ".*";
                i += 1;
                if (pattern[i + 1] === "/") {
                    source += "/?";
                    i += 1;
                }
            }
            else {
                source += "[^/\\\\]*";
            }
        }
        else if (ch === "?") {
            source += "[^/\\\\]";
        }
        else if (ch === "[") {
            const end = pattern.indexOf("]", i + 1);
            if (end === -1) {
                source += "\\[";
            }
            else {
                source += pattern.slice(i, end + 1);
                i = end;
            }
        }
        else {
            source += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
        }
    }
    return new RegExp(`${source}$`, "i");
}
//# sourceMappingURL=safepath.js.map