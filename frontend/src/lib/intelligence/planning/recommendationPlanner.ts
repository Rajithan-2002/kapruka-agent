import { ExtractionResult, RelationshipProfile, StrategyType, RecommendationPlan, EngineResult } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";

export class RecommendationPlanner {
  constructor(private tracer: IntelligenceTracer) {}

  public evaluate(
    extraction: ExtractionResult,
    strategy: StrategyType,
    relationship?: RelationshipProfile
  ): EngineResult<RecommendationPlan> {
    const trace = this.tracer.startTrace("RecommendationPlanner", { strategy });

    const plan: RecommendationPlan = {
      planVersion: "v1",
      strategy,
      preferredCategories: [],
      avoidCategories: [],
      hardBlocks: [],
      diversityRules: []
    };

    const { situation } = extraction;

    // Apply Relationship Preferences
    if (relationship) {
      if (relationship.interests && relationship.interests.length > 0) {
        plan.preferredCategories.push(...relationship.interests);
      }
      if (relationship.dislikes && relationship.dislikes.length > 0) {
        plan.hardBlocks.push(...relationship.dislikes);
      }
    }

    // Apply Strategy Constraints
    if (strategy === "RELATIONSHIP_REPAIR") {
      plan.preferredCategories.push("Flowers", "Premium Chocolates", "Jewelry");
      plan.hardBlocks.push("Gag Gifts", "Cheap Items", "Everyday Essentials");
    } else if (strategy === "LAST_MINUTE_RESCUE") {
      plan.deliveryConstraint = situation.urgency === "IMMEDIATE" ? "TODAY" : "TOMORROW";
      plan.diversityRules.push("Must include fast delivery items");
    } else if (strategy === "SAFE_BET") {
      plan.preferredCategories.push("Gift Vouchers", "Fruit Baskets", "Classic Cakes");
      plan.avoidCategories.push("Clothing", "Personal Care"); // High risk of wrong size/preference
    }

    // Apply Occasion Hard Blocks (Child safety etc)
    if (situation.occasion.toLowerCase().includes("kid") || situation.recipient_type === "FAMILY" && situation.recipient.toLowerCase().includes("child")) {
      plan.hardBlocks.push("Alcohol", "Adult");
    }

    if (situation.occasion.toLowerCase().includes("sympathy") || situation.occasion.toLowerCase().includes("funeral")) {
      plan.hardBlocks.push("Alcohol", "Party Items", "Balloons");
      plan.preferredCategories.push("Sympathy Flowers", "Fruit Baskets");
    }

    // Apply Budget constraints
    if (situation.budget.max) {
      plan.priceTarget = {
        min: situation.budget.min || 0,
        max: situation.budget.max
      };
    }

    return { result: plan, trace: trace.end(plan, 1.0, "Constructed recommendation plan v1") };
  }
}
