export interface FeedbackStats {
  positiveVotes: number;
  negativeVotes: number;
  totalVotes: number;
  last_updated: string;
}

export class CommunityFeedbackEngine {
  private static MIN_INTERACTIONS_THRESHOLD = 10;

  /**
   * Generates a standardized context key from recommendation variables
   */
  public static generateContextKey(
    recipient: string = 'unknown',
    occasion: string = 'unknown',
    category: string = 'unknown',
    strategy: string = 'unknown'
  ): string {
    const sanitize = (str: string) => (str || 'unknown').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sanitize(recipient)}_${sanitize(occasion)}_${sanitize(category)}_${sanitize(strategy)}`;
  }

  /**
   * Applies the Community Feedback adjustments to the base score of a product.
   * Returns the modifier to apply (penalty or bonus).
   */
  public static evaluateModifier(stats: FeedbackStats | undefined | null): { modifier: number, reason: string } {
    if (!stats) {
      return { modifier: 0, reason: "No community data" };
    }

    // Apply Time Decay
    let decayFactor = 1.0;
    const daysSinceLastUpdate = (Date.now() - new Date(stats.last_updated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUpdate > 180) decayFactor = 0.25;
    else if (daysSinceLastUpdate > 90) decayFactor = 0.50;
    else if (daysSinceLastUpdate > 30) decayFactor = 0.75;

    const decayedPositive = stats.positiveVotes * decayFactor;
    const decayedNegative = stats.negativeVotes * decayFactor;
    const decayedTotal = decayedPositive + decayedNegative;

    if (decayedTotal < this.MIN_INTERACTIONS_THRESHOLD) {
      return { modifier: 0, reason: "Insufficient community data (or decayed below threshold)" };
    }

    // Positive Reinforcement
    if (decayedPositive > 0 && decayedPositive > decayedNegative) {
      const positiveRatio = decayedPositive / decayedTotal;
      if (positiveRatio > 0.8 && decayedPositive >= 20) {
         return { modifier: +10, reason: "Highly rated by community for this context" };
      }
      if (positiveRatio > 0.6) {
         return { modifier: +5, reason: "Generally preferred by community" };
      }
    }

    // Penalties based on negative brackets
    if (decayedNegative >= 50) {
      return { modifier: -50, reason: "Strongly rejected by community (50+ negatives)" };
    } else if (decayedNegative >= 20) {
      return { modifier: -30, reason: "Frequently rejected by community (20+ negatives)" };
    } else if (decayedNegative >= 10) {
      return { modifier: -15, reason: "Often rejected by community (10+ negatives)" };
    } else if (decayedNegative >= 5) {
      return { modifier: -5, reason: "Mixed community reception (5+ negatives)" };
    }

    return { modifier: 0, reason: "Neutral community reception" };
  }
}
