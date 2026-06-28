process.env.OPENAI_API_KEY = "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";

async function runTest() {
    const { IntelligenceOrchestrator } = await import("./src/lib/intelligence/orchestrator/intelligenceOrchestrator");
    const orchestrator = new IntelligenceOrchestrator();
    const result = await orchestrator.processRequest("test_user", "Hey Kappy, just so you know, a zorp means a birthday cake.", []);
    console.log(JSON.stringify(result, null, 2));
}

runTest().catch(console.error);

export {};

