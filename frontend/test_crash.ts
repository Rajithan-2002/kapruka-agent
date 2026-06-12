import { IntelligenceOrchestrator } from "./src/lib/intelligence/orchestrator/intelligenceOrchestrator";

async function run() {
    try {
        const orchestrator = new IntelligenceOrchestrator();
        console.log("Processing...");
        const result = await orchestrator.processRequest("test_user_id", "I need a gift but I don't know what to get", []);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error caught:");
        console.error(e);
    }
}

run();
