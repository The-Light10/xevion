import { z } from "zod";
import { defineTool } from "./types.js";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const todos: Todo[] = [];
let nextId = 1;

const schema = z.object({
  action: z.enum(["add", "list", "done", "remove", "clear"]),
  text: z.string().optional(),
  id: z.number().int().min(1).optional(),
});

export const todoTool = defineTool({
  name: "todo",
  description: "Tiene una lista di attività per il task corrente.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["add", "list", "done", "remove", "clear"] },
      text: { type: "string" },
      id: { type: "integer", minimum: 1 },
    },
    required: ["action"],
    additionalProperties: false,
  },
  risk: "low",
  async run(args) {
    switch (args.action) {
      case "add": {
        if (!args.text) throw new Error("text obbligatorio per add");
        todos.push({ id: nextId, text: args.text, done: false });
        return `Aggiunto #${nextId++}`;
      }
      case "done": {
        const item = todos.find((todo) => todo.id === args.id);
        if (!item) throw new Error("ID non trovato");
        item.done = true;
        return `Completato #${item.id}`;
      }
      case "remove": {
        const index = todos.findIndex((todo) => todo.id === args.id);
        if (index === -1) throw new Error("ID non trovato");
        todos.splice(index, 1);
        return `Rimosso #${args.id}`;
      }
      case "clear":
        todos.length = 0;
        return "Lista svuotata";
      case "list":
      default:
        if (todos.length === 0) return "Nessuna attività";
        return todos.map((todo) => `${todo.done ? "x" : " "} #${todo.id} ${todo.text}`).join("\n");
    }
  },
});
