import { ExtractionResult } from "../types/intelligence.types";

export class ConfidenceBuilder {
  /**
   * Generates reassurance points based on the user's psychological state.
   */
  public static evaluate(extraction: ExtractionResult): string[] {
    const reassurances: string[] = [];
    const { psychology, situation } = extraction || {};

    if (!psychology || !situation) return reassurances;

    // High anxiety / guilt / apology
    if (psychology?.primaryTrigger === "APOLOGY" || psychology?.primaryTrigger === "GUILT") {
      reassurances.push("This is a thoughtful choice that shows you truly care.");
    }

    // High urgency
    if (situation?.urgency === "HIGH" || situation?.urgency === "IMMEDIATE") {
      reassurances.push("Don't worry, we can get this delivered on time.");
    }

    // High emotional intensity
    if (psychology?.emotionalIntensity && psychology.emotionalIntensity >= 8) {
      reassurances.push("We'll handle this order with extra care.");
    }

    return reassurances;
  }
}
