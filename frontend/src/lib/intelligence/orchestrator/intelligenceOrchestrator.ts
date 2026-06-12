import { IntelligenceTracer } from "../observability/tracer";
import { runIntelligenceExtraction } from "./intelligenceExtraction";
import { ContextConfidenceEngine } from "../confidence/contextConfidenceEngine";
import { MissingInfoDetector } from "../missing/missingInfoDetector";
import { RelationshipEngine } from "../relationship/relationshipEngine";
import { StrategySelector } from "../strategy/strategySelector";
import { RecommendationPlanner } from "../planning/recommendationPlanner";
import { IntelligenceOutput } from "../types/intelligence.types";

export class IntelligenceOrchestrator {
  private tracer: IntelligenceTracer;
  private confidenceEngine: ContextConfidenceEngine;
  private missingInfoDetector: MissingInfoDetector;
  private relationshipEngine: RelationshipEngine;
  private strategySelector: StrategySelector;
  private recommendationPlanner: RecommendationPlanner;

  constructor() {
    this.tracer = new IntelligenceTracer();
    this.confidenceEngine = new ContextConfidenceEngine(this.tracer);
    this.missingInfoDetector = new MissingInfoDetector(this.tracer);
    this.relationshipEngine = new RelationshipEngine(this.tracer);
    this.strategySelector = new StrategySelector(this.tracer);
    this.recommendationPlanner = new RecommendationPlanner(this.tracer);
  }

  public async processRequest(userId: string | undefined, userMessage: string, chatHistory: any[]): Promise<IntelligenceOutput> {
    this.tracer.clearTraces();

    // 1. Single LLM Extraction Pass
    const extraction = await runIntelligenceExtraction(userMessage, chatHistory, this.tracer);

    // 2. Context Confidence Gate (Stage 0)
    const confidenceGate = this.confidenceEngine.evaluate(extraction);

    // 3. If not ready, handle Missing Info
    if (!confidenceGate.result.recommendationReady) {
      const missingInfo = this.missingInfoDetector.evaluate(extraction, confidenceGate.result, chatHistory);

      return {
        readyForRecommendation: false,
        intelligenceScore: 0, // Score is 0 if we aren't recommending yet
        nextQuestion: missingInfo.result.nextQuestion,
        intent: extraction.intent,
        situation: extraction.situation,
        psychology: extraction.psychology,
        product_type: extraction.product_type,
        mapped_category: extraction.mapped_category,
        preference_corrections: extraction.preference_corrections,
        price_refinement: extraction.price_refinement,
        traces: this.tracer.getTraces()
      };
    }

    // 3b. If ready but needs refinement
    let nextQuestion: string | undefined;
    if (confidenceGate.result.reason === "needs_refinement") {
      const missingInfo = this.missingInfoDetector.evaluate(extraction, confidenceGate.result, chatHistory);
      nextQuestion = missingInfo.result.nextQuestion;
    }

    // Phase 2 engines (Relationship, Strategy, Planner)
    const relationshipResult = await this.relationshipEngine.evaluate(userId, extraction);
    const relationship = relationshipResult.result;

    const strategyResult = this.strategySelector.evaluate(extraction, relationship);
    const strategy = strategyResult.result.strategy;

    const plannerResult = this.recommendationPlanner.evaluate(extraction, strategy, relationship);
    const plan = plannerResult.result;

    // Calculate preliminary Intelligence Score
    // e.g. Confidence (50) + Strategy match (30) + Memory usage (20)
    let intelligenceScore = Math.floor(confidenceGate.result.confidence * 60);
    if (relationship && relationship.id !== "temp") intelligenceScore += 20;
    intelligenceScore += 20; // Default points for planner execution

    return {
      readyForRecommendation: true,
      intelligenceScore,
      recommendationConfidence: confidenceGate.result.confidence,
      recommendation_mode: extraction.recommendation_mode,
      nextQuestion,
      intent: extraction.intent,
      situation: extraction.situation,
      psychology: extraction.psychology,
      product_type: extraction.product_type,
      mapped_category: extraction.mapped_category,
      preference_corrections: extraction.preference_corrections,
      price_refinement: extraction.price_refinement,
      relationship,
      plan,
      traces: this.tracer.getTraces()
    };
  }
}
