import { ExtractionResult, EngineResult } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";
import { ConfidenceResult } from "../confidence/contextConfidenceEngine";

export interface MissingInfoResult {
  nextQuestion: string;
}

export class MissingInfoDetector {
  constructor(private tracer: IntelligenceTracer) {}

  public evaluate(extraction: ExtractionResult, confidenceGate: ConfidenceResult, chatHistory: any[]): EngineResult<MissingInfoResult> {
    const trace = this.tracer.startTrace("MissingInfoDetector", { reason: confidenceGate.reason });

    let nextQuestion = "";

    // Extract the highest priority missing field that hasn't been asked recently
    let topMissingField = "";
    if (extraction.missingInfo?.missingFields && extraction.missingInfo.missingFields.length > 0) {
      // Sort by priority (1 is highest)
      const sortedFields = [...extraction.missingInfo.missingFields].sort((a, b) => a.priority - b.priority);
      
      // Cooldown check: Look at the last 3 Kappy messages
      const recentKappyMessages = chatHistory.filter(m => m.role === "assistant" || m.role === "Kappy").slice(-3);
      const recentText = recentKappyMessages.map(m => (m.content || "").toLowerCase()).join(" ");
      
      const fieldKeywords: Record<string, string[]> = {
        "product_type": ["product", "type", "kind", "what"],
        "occasion": ["occasion", "event", "celebration", "why"],
        "recipient": ["who", "recipient", "for"],
        "budget": ["budget", "spend", "cost", "price", "much"]
      };

      for (const mf of sortedFields) {
        // Cooldown heuristic: Check if any keyword mapped to this field was used by Kappy recently
        const keywords = fieldKeywords[mf.field.toLowerCase()] || [mf.field.toLowerCase()];
        const askedRecently = keywords.some(kw => recentText.includes(kw));

        if (!askedRecently) {
          topMissingField = mf.field;
          break;
        }
      }
      
      // If all were asked recently, default to the first one anyway
      if (!topMissingField) {
        topMissingField = sortedFields[0].field;
      }
    }

    if (confidenceGate.reason === "recipient_missing" || confidenceGate.reason === "recipient_and_occasion_missing") {
      nextQuestion = "Who are we shopping for? (e.g., your dad, wife, a friend?)";
    } else if (extraction.missingInfo?.suggestedQuestion) {
      nextQuestion = extraction.missingInfo.suggestedQuestion;
      
      // If we are in "needs_refinement", adapt the question to be a refinement rather than a blocker
      if (confidenceGate.reason === "needs_refinement") {
        if (topMissingField === "occasion") {
          nextQuestion = "To personalize these further, what's the occasion?";
        } else if (topMissingField === "budget") {
          nextQuestion = "These are just a start! Did you have a specific budget in mind?";
        } else if (topMissingField === "recipient") {
          nextQuestion = "To narrow these down, who are we shopping for?";
        } else if (topMissingField) {
          nextQuestion = "To get you the perfect item, " + nextQuestion.replace(/^(Could you|Can you|Please tell me)/i, "could you tell me");
        }
      }
    } else if (topMissingField) {
      // Fallback if LLM didn't suggest a question but we have a missing field
      nextQuestion = "I'm not quite sure I understand. Could you tell me a bit more about what you're looking for?";
    }

    const result = { nextQuestion };

    return { result, trace: trace.end(result, 1.0, "Generated missing info question based on confidence gate reason") };
  }
}
