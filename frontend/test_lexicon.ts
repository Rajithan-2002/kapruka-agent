import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function runTest() {
    const { IntelligenceOrchestrator } = await import("./src/lib/intelligence/orchestrator/intelligenceOrchestrator");
    const orchestrator = new IntelligenceOrchestrator();
    const result = await orchestrator.processRequest("test_user", "Hey Kappy, just so you know, a zorp means a birthday cake.", []);
    console.log(JSON.stringify(result, null, 2));
}

runTest().catch(console.error);

export {};

