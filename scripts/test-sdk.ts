import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Reply with exactly the string: SDK_OK",
  options: { maxTurns: 1, allowedTools: [] },
})) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") console.log("[assistant]", block.text);
    }
  } else if (message.type === "result") {
    console.log("[result]", message.subtype, "—", "result" in message ? message.result : "");
  }
}
