import { ContextConfidenceEngine } from "./frontend/src/lib/intelligence/confidence/contextConfidenceEngine";
import { IntelligenceTracer } from "./frontend/src/lib/intelligence/observability/tracer";
import { runSemanticIrrelevanceFilter } from "./frontend/src/lib/intelligence/recommendation/semanticFilter";

async function runTests() {
    console.log("=== Testing ContextConfidenceEngine ===");
    const tracer = new IntelligenceTracer();
    const engine = new ContextConfidenceEngine(tracer);

    const testCases = [
        {
            name: "Graduation (Occasion Only)",
            extraction: {
                intent: "SHOPPING",
                intentConfidence: 0.9,
                situation: { recipient: "UNKNOWN", occasion: "graduation" },
                product_type: "UNKNOWN",
                missingInfo: { isMissingCriticalInfo: true },
                search_sufficiency_score: 0.5
            }
        },
        {
            name: "Something Nice (No Context)",
            extraction: {
                intent: "SHOPPING",
                intentConfidence: 0.9,
                situation: { recipient: "UNKNOWN", occasion: "UNKNOWN" },
                product_type: "UNKNOWN",
                missingInfo: { isMissingCriticalInfo: true },
                search_sufficiency_score: 0.2
            }
        },
        {
            name: "Seiko Watch (Precise)",
            extraction: {
                intent: "SHOPPING",
                intentConfidence: 0.9,
                situation: { recipient: "UNKNOWN", occasion: "UNKNOWN" },
                product_type: "Seiko watch",
                missingInfo: { isMissingCriticalInfo: false },
                search_sufficiency_score: 0.9
            }
        }
    ];

    for (const tc of testCases) {
        const result = engine.evaluate(tc.extraction as any);
        console.log(`[${tc.name}] Ready: ${result.result.recommendationReady}, Mode: ${result.result.searchMode}`);
    }

    console.log("\n=== Testing runSemanticIrrelevanceFilter ===");
    const mockProducts = Array.from({ length: 40 }).map((_, i) => ({
        id: `prod_${i}`,
        name: `Product ${i}`,
        category: `Category ${i % 3}`
    }));

    const result = await runSemanticIrrelevanceFilter("graduation", "UNKNOWN", mockProducts, "EXPLORATORY", 0.4);
    console.log("Exploratory metrics:", result.metrics);
}

runTests();
