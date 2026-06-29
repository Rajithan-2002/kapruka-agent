import { IntelligenceOrchestrator } from "@/lib/intelligence/orchestrator/intelligenceOrchestrator";

const SCENARIOS = [
    { name: "Father's Day Gift", input: "Need Father's Day gift under 5000", expectedIntent: "GIFTING" },
    { name: "Anniversary Forgotten", input: "Forgot my anniversary tomorrow. Need something quick", expectedIntent: "GIFTING" },
    { name: "Teacher Appreciation", input: "Need a gift for my teacher to say thank you", expectedIntent: "GIFTING" },
    { name: "Corporate Gift", input: "Need 50 premium hampers for corporate clients", expectedIntent: "GIFTING" },
    { name: "Reorder Water Bottles", input: "Can I get those same water bottles I ordered last time?", expectedIntent: "REORDER" },
    { name: "Budget Rs.2000", input: "Need something under Rs 2000 for a friend", expectedIntent: "GIFTING" },
    { name: "Same Day Delivery", input: "Need a birthday cake today in Colombo", expectedIntent: "GIFTING" },
    { name: "Mother's Birthday", input: "It's my mom's birthday next week", expectedIntent: "GIFTING" },
    { name: "Apology Gift", input: "I messed up and need an apology gift for my wife", expectedIntent: "GIFTING" },
    { name: "Unknown Recipient", input: "I need to buy a gift but I don't know what to get", expectedIntent: "GIFTING" }
];

async function runEvaluations() {
    console.log("==================================================");
    console.log("KAPPY INTELLIGENCE ENGINE: EVALUATION RUNNER V1");
    console.log("==================================================\n");

    const orchestrator = new IntelligenceOrchestrator();
    let passed = 0;

    for (const [index, scenario] of SCENARIOS.entries()) {
        console.log(`[TEST ${index + 1}] ${scenario.name}`);
        console.log(`Input: "${scenario.input}"`);

        try {
            const start = performance.now();
            const result = await orchestrator.processRequest("test-user-123", scenario.input, []);
            const end = performance.now();

            const isPass = result.intent === scenario.expectedIntent;

            if (isPass) {
                passed++;
                console.log(`✅ PASS (${Math.round(end - start)}ms)`);
                console.log(`   Extracted Intent: ${result.intent}`);
                if (result.situation?.recipient) console.log(`   Extracted Recipient: ${result.situation.recipient}`);
                if (result.situation?.occasion) console.log(`   Extracted Occasion: ${result.situation.occasion}`);
            } else {
                console.log(`❌ FAIL`);
                console.log(`   Expected: ${scenario.expectedIntent}`);
                console.log(`   Got: ${result.intent}`);
            }
        } catch (error) {
            console.log(`❌ ERROR: ${error}`);
        }
        console.log("--------------------------------------------------");
    }

    console.log(`\n==================================================`);
    console.log(`FINAL RESULTS: ${passed} / ${SCENARIOS.length} PASSED (${Math.round((passed/SCENARIOS.length)*100)}%)`);
    console.log(`==================================================`);
}

runEvaluations().then(() => process.exit(0)).catch(console.error);
