import { RankedProduct } from "../validation/commonSenseValidator";

export interface DecisionSupportResult {
  topPick?: RankedProduct;
  reasoning: string;
  tradeoffs?: string;
  alternatives?: RankedProduct[];
}

export class DecisionSupportEngine {
  /**
   * Generates a human-like decision support analysis for the user,
   * explaining WHY the top product was picked and what the tradeoffs are.
   */
  public static evaluate(products: RankedProduct[]): DecisionSupportResult {
    if (!products || products.length === 0) {
      return { reasoning: "No products available to analyze." };
    }

    const topPick = products[0];
    const alternatives = products.slice(1, 3);

    let reasoning = `I selected the ${topPick.name} as my top recommendation because it perfectly matches your requirements.`;
    if (topPick.reasons && topPick.reasons.length > 0) {
      reasoning = `I highly recommend the ${topPick.name}. ${topPick.reasons[0]}`;
    }

    let tradeoffs = "";
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      if (alt.price < topPick.price) {
        tradeoffs = `If you're looking to save a bit, the ${alt.name} is a great budget-friendly alternative.`;
      } else if (alt.price > topPick.price) {
        tradeoffs = `If you're willing to spend a bit more for a premium option, consider the ${alt.name}.`;
      } else {
        tradeoffs = `Another excellent option is the ${alt.name}, which has a similar vibe.`;
      }
    }

    return {
      topPick,
      reasoning,
      tradeoffs,
      alternatives
    };
  }
}
