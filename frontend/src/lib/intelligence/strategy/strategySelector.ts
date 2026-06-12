import { ExtractionResult, RelationshipProfile, StrategyType, EngineResult } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";

export class StrategySelector {
  constructor(private tracer: IntelligenceTracer) {}

  public evaluate(extraction: ExtractionResult, relationship?: RelationshipProfile): EngineResult<{ strategy: StrategyType }> {
    const trace = this.tracer.startTrace("StrategySelector", { intent: extraction.intent, psychology: extraction.psychology });

    let strategy: StrategyType = "GUIDED_GIFTING";
    let reasoning = "Default gifting strategy";

    const { intent, situation, psychology } = extraction;

    // Rule 1: Apology / Guilt
    if (psychology?.primaryTrigger === "APOLOGY" || psychology?.primaryTrigger === "GUILT") {
      strategy = "RELATIONSHIP_REPAIR";
      reasoning = "Apology trigger detected";
    }
    // Rule 2: Last minute rescue
    else if (situation?.urgency === "HIGH" || situation?.urgency === "IMMEDIATE") {
      strategy = "LAST_MINUTE_RESCUE";
      reasoning = "High urgency detected";
    }
    // Rule 3: Budget constraint
    else if (situation?.budget?.max && situation.budget.max < 3000 && !situation?.budget?.is_flexible) {
      strategy = "BUDGET_OPTIMIZATION";
      reasoning = "Strict low budget detected";
    }
    // Rule 4: Weak relationship -> Safe bet
    else if (relationship && relationship.relationship_strength <= 3) {
      strategy = "SAFE_BET";
      reasoning = "Weak relationship strength implies a safe bet is needed";
    }
    // Rule 5: Specific occasions
    else if (situation?.occasion?.toLowerCase().includes("funeral") || psychology?.primaryTrigger === "SYMPATHY") {
      strategy = "SAFE_BET";
      reasoning = "Sympathy/Funeral implies safe and respectful gifts";
    }

    const result = { strategy };
    return { result, trace: trace.end(result, 1.0, reasoning) };
  }
}
