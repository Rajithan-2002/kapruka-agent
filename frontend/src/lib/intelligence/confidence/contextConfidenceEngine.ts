import { ExtractionResult, EngineResult } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";

export interface ConfidenceResult {
  confidence: number;
  recommendationReady: boolean;
  reason?: string;
}

export class ContextConfidenceEngine {
  constructor(private tracer: IntelligenceTracer) {}

  public evaluate(extraction: ExtractionResult): EngineResult<ConfidenceResult> {
    const trace = this.tracer.startTrace("ContextConfidenceGate", { intentConfidence: extraction.intentConfidence, missingInfo: extraction.missingInfo });

    let confidence = extraction.intentConfidence || 1.0;
    let ready = true;
    let reason: string | undefined;

    const mode = extraction.recommendation_mode || "FAST";
    const mvcThreshold = mode === "PRECISION" ? 0.65 : 0.4;

    // Rule 1: Overall Intent Confidence Check
    if (confidence < mvcThreshold) {
      ready = false;
      reason = "low_intent_confidence";
    } else if (confidence < 0.7) {
      ready = true;
      reason = "needs_refinement";
    }

    // Rule 2: Gift but BOTH recipient and occasion are UNKNOWN
    if (extraction.intent === "GIFTING" && extraction.situation.recipient === "UNKNOWN" && extraction.situation.occasion === "UNKNOWN") {
      ready = false;
      reason = "recipient_and_occasion_missing";
      confidence = Math.min(confidence, 0.5); // Punish confidence
    }

    // Kappy V2: Search Sufficiency Score (Search First, Ask Later)
    const sufficiencyScore = extraction.search_sufficiency_score !== undefined ? extraction.search_sufficiency_score : confidence;
    const isSearchSufficient = sufficiencyScore >= 0.6;

    // Programmatic MVC Check to override overly strict LLM behavior
    let mvcMet = false;
    const REFINEMENT_INTENTS = ["PRICE_REFINEMENT", "PREFERENCE_CORRECTION"];

    if (REFINEMENT_INTENTS.includes(extraction.intent)) {
      mvcMet = true; // Always bypass for existing pool refinements
    } else if (extraction.intent === "GIFTING" && (extraction.situation.recipient !== "UNKNOWN" || extraction.situation.occasion !== "UNKNOWN")) {
      mvcMet = true;
    } else if (["SHOPPING", "BROWSING"].includes(extraction.intent) && extraction.product_type !== "UNKNOWN") {
      mvcMet = true;
    } else if (extraction.intent === "REORDER") {
      mvcMet = true;
    } else if (extraction.intent === "SMALL_TALK" || extraction.intent === "UNKNOWN" || extraction.intent === "COMPLAINT") {
      mvcMet = true; // Don't block non-shopping flows
    }

    // Rule 3: The LLM flagged missing info, but we only block if programmatic MVC is NOT met AND search is NOT sufficient
    if (extraction.missingInfo?.isMissingCriticalInfo && !mvcMet && !isSearchSufficient) {
      ready = false;
      reason = "critical_info_missing";
      confidence = Math.min(confidence, 0.6);
    } else if (extraction.missingInfo?.isMissingCriticalInfo && (mvcMet || isSearchSufficient)) {
      // LLM thought we needed to stop, but MVC is met OR Search is Sufficient. 
      // Push to refinement mode (ask later) instead of blocking!
      if (confidence >= mvcThreshold) {
        ready = true;
        reason = "needs_refinement";
      }
    }

    const result: ConfidenceResult = {
      confidence,
      recommendationReady: ready,
      reason
    };

    return { result, trace: trace.end(result, confidence, ready ? "Context is confident enough to proceed" : `Failed confidence check: ${reason}`) };
  }
}
