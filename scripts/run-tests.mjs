import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "dist-test", "test");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => join(dir, name));

if (files.length === 0) {
  console.error("Nessun test compilato trovato");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
