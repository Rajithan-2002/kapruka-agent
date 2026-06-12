export type IntentType =
  | "SHOPPING"
  | "GIFTING"
  | "REORDER"
  | "BROWSING"
  | "DELIVERY"
  | "TRACKING"
  | "COMPLAINT"
  | "SMALL_TALK"
  | "PREFERENCE_CORRECTION"
  | "PRICE_REFINEMENT"
  | "EXPLORATION"
  | "UNKNOWN";

export type TriggerType =
  | "APPRECIATION"
  | "LOVE"
  | "APOLOGY"
  | "GUILT"
  | "OBLIGATION"
  | "CELEBRATION"
  | "SYMPATHY"
  | "UNKNOWN";

export type StrategyType =
  | "GUIDED_GIFTING"
  | "RELATIONSHIP_REPAIR"
  | "LAST_MINUTE_RESCUE"
  | "BUDGET_OPTIMIZATION"
  | "SAFE_BET"
  | "UNKNOWN";

export interface SituationContext {
  recipient: string;
  recipient_type: "FAMILY" | "FRIEND" | "ROMANTIC" | "COLLEAGUE" | "ACQUAINTANCE" | "SELF" | "UNKNOWN";
  occasion: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
  budget: {
    min?: number;
    max?: number;
    currency: string;
    is_flexible: boolean;
  };
  location?: string;
  delivery_requirements?: string;
}

export interface PsychologyContext {
  primaryTrigger: TriggerType;
  secondaryTrigger?: TriggerType;
  emotionalIntensity: number; // 1-10
}

export interface RelationshipProfile {
  id: string;
  recipient_name: string;
  relationship_type: string;
  interests: string[];
  dislikes: string[];
  successful_gifts: string[];
  failed_gifts: string[];
  relationship_strength: number; // 1-10
}

export interface RecommendationPlan {
  planVersion: "v1";
  strategy: StrategyType;
  preferredCategories: string[];
  avoidCategories: string[];
  hardBlocks: string[]; // e.g., "adult", "alcohol" if for a child
  diversityRules: string[]; // e.g., "Must include at least one experiential gift"
  priceTarget?: {
    min: number;
    max: number;
  };
  deliveryConstraint?: "TODAY" | "TOMORROW" | "ANY";
}

export interface IntelligenceTrace {
  engine: string;
  timestamp: number;
  confidence: number;
  latencyMs: number;
  inputs?: any;
  outputs?: any;
  reasoning?: string;
}

export interface EngineResult<T> {
  result: T;
  trace: IntelligenceTrace;
}

export interface MissingInfo {
  isMissingCriticalInfo: boolean;
  missingFields: { field: string; priority: number }[];
  suggestedQuestion?: string;
}

// Phase 1 Extraction Pass Result
export interface ExtractionResult {
  intent: IntentType;
  intentConfidence: number;
  situation: SituationContext;
  psychology: PsychologyContext;
  product_type?: string;
  mapped_category?: string;
  interaction_mode?: "DISCOVERY" | "RECOMMENDATION" | "REFINEMENT";
  action?: "SEARCH" | "SHOW_MORE" | "RECALL_PREVIOUS_RESULTS";
  search_sufficiency_score?: number;
  recommendation_mode?: "FAST" | "PRECISION";
  preference_corrections?: {
    type: "CATEGORY" | "PRODUCT_TYPE" | "RECIPIENT_PREFERENCE" | "STYLE";
    target: string;
    negative: boolean;
    strength: "SOFT" | "HARD";
    recipient?: string;
  }[];
  price_refinement?: {
    sort_order?: "ASC" | "DESC" | "CHEAPER" | "PREMIUM";
    min_price?: number;
    max_price?: number;
    target_price?: number;
    price_band?: "BUDGET" | "MID" | "PREMIUM" | "LUXURY";
  };
  missingInfo: MissingInfo;
}

export interface IntelligenceOutput {
  readyForRecommendation: boolean;
  intelligenceScore: number;
  recommendationConfidence?: number;
  recommendation_mode?: "FAST" | "PRECISION";
  nextQuestion?: string;
  product_type?: string;
  mapped_category?: string;
  interaction_mode?: "DISCOVERY" | "RECOMMENDATION" | "REFINEMENT";
  action?: "SEARCH" | "SHOW_MORE" | "RECALL_PREVIOUS_RESULTS";
  search_sufficiency_score?: number;
  
  // The accumulated state
  intent?: IntentType;
  situation?: SituationContext;
  psychology?: PsychologyContext;
  relationship?: RelationshipProfile;
  plan?: RecommendationPlan;
  preference_corrections?: {
    type: "CATEGORY" | "PRODUCT_TYPE" | "RECIPIENT_PREFERENCE" | "STYLE";
    target: string;
    negative: boolean;
    strength: "SOFT" | "HARD";
    recipient?: string;
  }[];
  price_refinement?: {
    sort_order?: "ASC" | "DESC" | "CHEAPER" | "PREMIUM";
    min_price?: number;
    max_price?: number;
    target_price?: number;
    price_band?: "BUDGET" | "MID" | "PREMIUM" | "LUXURY";
  };

  // Observability
  traces: IntelligenceTrace[];
}
