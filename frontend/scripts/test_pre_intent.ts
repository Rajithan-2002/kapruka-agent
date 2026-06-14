import { PreIntentParser } from "../src/lib/intelligence/normalization/preIntentParser";

interface TestCase {
    name: string;
    message: string;
    lastAssistantMessage: string | null;
    expectedPreClassified: boolean;
    expectedIntent?: string | null;
    expectedFallback: "LLM" | "NONE";
    expectedExclusionTarget?: string;
}

const testCases: TestCase[] = [
    {
        name: "Test 1: Unknown English phrase",
        message: "I want to buy something for my friend",
        lastAssistantMessage: null,
        expectedPreClassified: false,
        expectedFallback: "LLM"
    },
    {
        name: "Test 2: Pure Tamil Unicode with no dictionary entry",
        message: "என்னுடைய நண்பருக்கு ஏதாவது வாங்கணும்",
        lastAssistantMessage: null,
        expectedPreClassified: false,
        expectedFallback: "LLM"
    },
    {
        name: "Test 3: Mixed with dynamic category rejection",
        message: "maybe flowers venda, show me something else",
        lastAssistantMessage: null,
        expectedPreClassified: true,
        expectedIntent: "PRODUCT_REJECTION",
        expectedFallback: "NONE",
        expectedExclusionTarget: "flowers"
    },
    {
        name: "Test 4: Ambiguous word (hari), no confirmation context",
        message: "hari show me cakes",
        lastAssistantMessage: "Here are some cake options you might like.",
        expectedPreClassified: false,
        expectedFallback: "LLM"
    },
    {
        name: "Test 5: Ambiguous word (hari), with order summary confirmation context",
        message: "hari meka gannam",
        lastAssistantMessage: "Your total is Rs. 4500. Would you like to proceed?",
        expectedPreClassified: true,
        expectedIntent: "CHECKOUT_CONFIRM",
        expectedFallback: "NONE"
    },
    {
        name: "Test 6a: Ambiguous cancellation (illai) preceded by noun modifier",
        message: "budget illai",
        lastAssistantMessage: "What is your budget?",
        expectedPreClassified: false,
        expectedFallback: "LLM"
    },
    {
        name: "Test 6b: Ambiguous cancellation (illai) in isolation",
        message: "illai",
        lastAssistantMessage: "Should we proceed with this gift item?",
        expectedPreClassified: true,
        expectedIntent: "CANCELLATION",
        expectedFallback: "NONE"
    }
];

function runTests() {
    console.log("==================================================");
    console.log("RUNNING PRE-INTENT PARSER & NORMALIZATION TESTS");
    console.log("==================================================");

    let passedCount = 0;

    for (const tc of testCases) {
        console.log(`\nExecuting: ${tc.name}`);
        console.log(`- User Message: "${tc.message}"`);
        console.log(`- Last Assistant: "${tc.lastAssistantMessage || 'None'}"`);

        const result = PreIntentParser.parse(tc.message, [], tc.lastAssistantMessage);

        console.log(`- Result: pre_classified=${result.pre_classified}, intent=${result.intent}, fallback=${result.fallback}, slots=${JSON.stringify(result.slots)}`);

        let passed = true;

        if (result.pre_classified !== tc.expectedPreClassified) {
            console.error(`  ❌ Failed: Expected pre_classified to be ${tc.expectedPreClassified}, got ${result.pre_classified}`);
            passed = false;
        }

        if (tc.expectedIntent !== undefined && result.intent !== tc.expectedIntent) {
            console.error(`  ❌ Failed: Expected intent to be "${tc.expectedIntent}", got "${result.intent}"`);
            passed = false;
        }

        if (result.fallback !== tc.expectedFallback) {
            console.error(`  ❌ Failed: Expected fallback to be "${tc.expectedFallback}", got "${result.fallback}"`);
            passed = false;
        }

        if (tc.expectedExclusionTarget !== undefined && result.slots?.exclusion_target !== tc.expectedExclusionTarget) {
            console.error(`  ❌ Failed: Expected exclusion_target to be "${tc.expectedExclusionTarget}", got "${result.slots?.exclusion_target}"`);
            passed = false;
        }

        if (passed) {
            console.log("  ✅ Passed!");
            passedCount++;
        }
    }

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passedCount} / ${testCases.length} Passed`);
    console.log("==================================================");

    if (passedCount !== testCases.length) {
        process.exit(1);
    }
}

runTests();
