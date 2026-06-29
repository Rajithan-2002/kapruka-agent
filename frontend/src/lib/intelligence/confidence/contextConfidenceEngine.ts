import { ExtractionResult, EngineResult } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";

export interface ConfidenceResult {
  confidence: number;
  recommendationReady: boolean;
  reason?: string;
  searchMode?: "EXPLORATORY" | "PRECISE";
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

    // Adaptive MVC Calculation
    let contextScore = 0;
    if (extraction.situation?.recipient && extraction.situation.recipient !== "UNKNOWN") contextScore += 0.4;
    if (extraction.situation?.occasion && extraction.situation.occasion !== "UNKNOWN") contextScore += 0.4;
    if (extraction.product_type && extraction.product_type !== "UNKNOWN") contextScore += 0.3;
    if (extraction.situation?.budget?.max || extraction.situation?.budget?.min) contextScore += 0.1;
    if (extraction.extracted_memory) contextScore += 0.2;

    const mvcMet = contextScore >= 0.4;
    const searchMode = (extraction.product_type && extraction.product_type !== "UNKNOWN") ? "PRECISE" : "EXPLORATORY";

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

    // Explicit override for EXPLORATION intent to ensure it triggers lead questions without blocking
    if (extraction.intent === "EXPLORATION") {
      ready = true;
      reason = "needs_refinement";
    }

    // Explicit bypass for Refinement intents
    const REFINEMENT_INTENTS = ["PRICE_REFINEMENT", "PREFERENCE_CORRECTION", "REORDER"];
    if (REFINEMENT_INTENTS.includes(extraction.intent) || ["SMALL_TALK", "UNKNOWN", "COMPLAINT"].includes(extraction.intent)) {
       ready = true;
       reason = "bypassed_for_intent";
    }

    const result: ConfidenceResult = {
      confidence,
      recommendationReady: ready,
      reason,
      searchMode
    };

    return { result, trace: trace.end(result, confidence, ready ? "Context is confident enough to proceed" : `Failed confidence check: ${reason}`) };
  }
}
