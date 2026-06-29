import { IntelligenceOrchestrator } from "./frontend/src/lib/intelligence/orchestrator/intelligenceOrchestrator";
import { TraceCollector } from "./frontend/src/lib/intelligence/observability/traceCollector";

async function run() {
    // initialize some dummy stuff if needed, but it should work.
    const orchestrator = new IntelligenceOrchestrator();
    const result = await orchestrator.processRequest("test-user-id", "can i order something for my brother's graduation he likes watches a lot", [], "");
    console.log(JSON.stringify(result, null, 2));
}
run();
