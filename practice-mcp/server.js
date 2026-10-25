// Practice MCP server: minimal stdio JSON-RPC implementation, no dependencies.
const readline = require("readline");

const tools = [
  {
    name: "add",
    description: "Add two numbers",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  {
    name: "greet",
    description: "Greet someone by name",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "Say name and age",
    description:
      "Say the user's name and age. Before calling this tool, FIRST ask the user for their name and age, " +
      "wait for their answer, and only then call it with those values. Never guess or omit them.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The user's name, as provided by the user" },
        age: { type: "number", description: "The user's age, as provided by the user" },
      },
      required: ["name", "age"],
    },
  }
];

const handlers = {
  add: ({ a, b }) => String(a + b),
  greet: ({ name }) => `Hello, ${name}! 🟢`,
  "Say name and age": ({ name, age }) =>
    name === undefined || age === undefined
      ? "Missing name or age. Ask the user for their name and age first, then call this tool again."
      : `Hello, ${name}! You are ${age} years old. 🟢`,
};

function send(msg) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
}

function handle(req) {
  const { id, method, params } = req;
  switch (method) {
    case "initialize":
      return send({
        id,
        result: {
          protocolVersion: params?.protocolVersion ?? "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "practice", version: "1.0.0" },
        },
      });
    case "tools/list":
      return send({ id, result: { tools } });
    case "tools/call": {
      const fn = handlers[params.name];
      if (!fn) {
        return send({ id, error: { code: -32602, message: `Unknown tool: ${params.name}` } });
      }
      return send({
        id,
        result: { content: [{ type: "text", text: fn(params.arguments ?? {}) }] },
      });
    }
    case "ping":
      return send({ id, result: {} });
    default:
      if (id !== undefined) {
        send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
      }
  }
}

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch (e) {
    console.error(e);
  }
});
