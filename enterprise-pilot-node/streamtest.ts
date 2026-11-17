import { LlmClient } from "./src/clients/llmClient.js";

const llm = new LlmClient();
const messages = [
    { role: "system" as const, content: "你是助手" },
    { role: "user" as const, content: "用一句话介绍你自己" },
];
try {
    let n = 0;
    for await (const delta of llm.chatStream(messages)) {
        n++;
        process.stdout.write(delta);
    }
    console.log("\n[OK] chunks=", n);
} catch (e) {
    console.error("\n[FAIL]", e instanceof Error ? e.name + ": " + e.message : e);
    const cause = (e as { cause?: unknown }).cause;
    console.error("cause:", cause);
}
