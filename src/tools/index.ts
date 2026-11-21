import type { Tool } from "./types.js";
import { readTool } from "./read.js";
import { writeTool } from "./write.js";
import { editTool } from "./edit.js";
import { globTool } from "./glob.js";
import { grepTool } from "./grep.js";
import { bashTool } from "./bash.js";
import { webfetchTool } from "./webfetch.js";
import { todoTool } from "./todo.js";

export const allTools: Tool[] = [
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  bashTool,
  webfetchTool,
  todoTool,
];

export function findTool(name: string): Tool | undefined {
  return allTools.find((tool) => tool.name === name);
}

export * from "./types.js";
