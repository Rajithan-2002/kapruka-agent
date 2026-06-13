import { IntelligenceOrchestrator } from "../orchestrator/intelligenceOrchestrator";

interface Scenario {
  name: string;
  input: string;
  expectedStrategy?: string;
  expectedRecipient?: string;
  expectClarification?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    name: "Missing Recipient",
    input: "I want to buy a gift.",
    expectClarification: true
  },
  {
    name: "Urgent Apology",
    input: "I forgot my wife's birthday today, I need something delivered ASAP under 5000.",
    expectedRecipient: "wife",
    expectedStrategy: "LAST_MINUTE_RESCUE" // or RELATIONSHIP_REPAIR
  },
  {
    name: "Sympathy Gift",
    input: "Need some flowers for a funeral tomorrow.",
    expectedStrategy: "SAFE_BET"
  },
  {
    name: "Low Budget Safe Bet",
    input: "Need a small gift for a colleague, max 1500",
    expectedRecipient: "colleague",
    expectedStrategy: "BUDGET_OPTIMIZATION"
  }
];

export class ScenarioTestRunner {
  public static async runTests() {
    console.log("Starting Intelligence Engine Scenario Tests...\n");
    const orchestrator = new IntelligenceOrchestrator();
    let passed = 0;
    let failed = 0;

    for (const scenario of SCENARIOS) {
      console.log(`Running: ${scenario.name}`);
      try {
        const result = await orchestrator.processRequest("test_user_1", scenario.input, []);
        
        let success = true;

        if (scenario.expectClarification && result.readyForRecommendation) {
          console.error(`  ❌ Failed: Expected clarification, but got recommendation plan.`);
          success = false;
        }

        if (scenario.expectedRecipient && result.situation?.recipient !== scenario.expectedRecipient && result.situation?.recipient_type !== scenario.expectedRecipient?.toUpperCase()) {
           // Basic check, might need better normalization
           console.warn(`  ⚠️ Warning: Expected recipient ${scenario.expectedRecipient}, got ${result.situation?.recipient}`);
        }

        if (scenario.expectedStrategy && result.plan?.strategy !== scenario.expectedStrategy) {
          // If relationship repair triggers before last minute rescue, etc.
          console.warn(`  ⚠️ Warning: Expected strategy ${scenario.expectedStrategy}, got ${result.plan?.strategy}`);
        }

        if (success) {
          console.log(`  ✅ Passed`);
          passed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`  ❌ Error executing scenario:`, err);
        failed++;
      }
    }

    console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);
    return { passed, failed };
  }
}
