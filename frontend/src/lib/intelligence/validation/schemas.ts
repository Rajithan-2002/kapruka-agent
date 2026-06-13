import { z } from "zod";

export const IntentTypeSchema = z.enum([
  "SHOPPING",
  "GIFTING",
  "REORDER",
  "BROWSING",
  "DELIVERY",
  "TRACKING",
  "COMPLAINT",
  "SMALL_TALK",
  "PREFERENCE_CORRECTION",
  "PRICE_REFINEMENT",
  "EXPLORATION",
  "SOCIAL",
  "EMOTIONAL_SUPPORT",
  "FRUSTRATION",
  "LIFE_EVENT",
  "UNKNOWN"
]).catch("UNKNOWN");

export const TriggerTypeSchema = z.enum([
  "APPRECIATION",
  "LOVE",
  "APOLOGY",
  "GUILT",
  "OBLIGATION",
  "CELEBRATION",
  "SYMPATHY",
  "UNKNOWN"
]).catch("UNKNOWN");

export const SituationContextSchema = z.object({
  recipient: z.string().default("UNKNOWN"),
  recipient_type: z.enum(["FAMILY", "FRIEND", "ROMANTIC", "COLLEAGUE", "ACQUAINTANCE", "SELF", "UNKNOWN"]).catch("UNKNOWN"),
  occasion: z.string().default("UNKNOWN"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "IMMEDIATE"]).catch("LOW"),
  budget: z.object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    currency: z.string().default("LKR"),
    is_flexible: z.boolean().default(true)
  }).default({ currency: "LKR", is_flexible: true }),
  location: z.string().nullable().optional(),
  delivery_requirements: z.string().nullable().optional()
}).default({
  recipient: "UNKNOWN",
  recipient_type: "UNKNOWN",
  occasion: "UNKNOWN",
  urgency: "LOW",
  budget: { currency: "LKR", is_flexible: true }
});

export const PsychologyContextSchema = z.object({
  primaryTrigger: TriggerTypeSchema.default("UNKNOWN"),
  secondaryTrigger: TriggerTypeSchema.nullable().optional(),
  emotionalIntensity: z.number().min(1).max(10).default(5)
}).default({
  primaryTrigger: "UNKNOWN",
  emotionalIntensity: 5
});

export const MissingInfoFieldSchema = z.object({
  field: z.string(),
  priority: z.number()
});

export const MissingInfoSchema = z.object({
  isMissingCriticalInfo: z.boolean().default(false),
  missingFields: z.array(MissingInfoFieldSchema).default([]),
  suggestedQuestion: z.string().optional()
}).default({
  isMissingCriticalInfo: false,
  missingFields: []
});

export const PreferenceCorrectionSchema = z.object({
  type: z.enum(["CATEGORY", "PRODUCT_TYPE", "RECIPIENT_PREFERENCE", "STYLE"]).catch("PRODUCT_TYPE"),
  target: z.string().default("UNKNOWN"),
  negative: z.boolean().default(true),
  strength: z.enum(["SOFT", "HARD"]).catch("HARD"),
  recipient: z.string().nullable().optional()
});

export const PriceRefinementSchema = z.object({
  sort_order: z.enum(["ASC", "DESC", "CHEAPER", "PREMIUM"]).nullable().optional().catch(null),
  min_price: z.number().nullable().optional(),
  max_price: z.number().nullable().optional(),
  target_price: z.number().nullable().optional(),
  price_band: z.enum(["BUDGET", "MID", "PREMIUM", "LUXURY"]).nullable().optional().catch(null)
});

export const ExtractedMemorySchema = z.object({
  category: z.enum(["preference", "behavior", "relationship", "general"]).catch("general"),
  relationship: z.string().nullable().optional(),
  interest: z.string().nullable().optional(),
  behavioral_trait: z.string().nullable().optional(),
  general_note: z.string().nullable().optional(),
  confidence: z.number().default(1.0)
});

export const ExtractionResultSchema = z.object({
  intent: IntentTypeSchema,
  intentConfidence: z.number().default(0.5),
  situation: SituationContextSchema,
  psychology: PsychologyContextSchema,
  product_type: z.string().nullable().optional().transform(v => v || "UNKNOWN"),
  mapped_category: z.string().nullable().optional().transform(v => v || "UNKNOWN"),
  interaction_mode: z.enum(["DISCOVERY", "RECOMMENDATION", "REFINEMENT", "UNKNOWN"]).catch("DISCOVERY"),
  action: z.enum(["SEARCH", "SHOW_MORE", "RECALL_PREVIOUS_RESULTS", "UNKNOWN"]).catch("SEARCH"),
  search_sufficiency_score: z.number().default(0.5),
  recommendation_mode: z.enum(["FAST", "PRECISION"]).catch("FAST"),
  preference_corrections: z.array(PreferenceCorrectionSchema).nullish().transform(v => v || []),
  price_refinement: PriceRefinementSchema.nullable().optional().catch(null),
  extracted_memory: ExtractedMemorySchema.nullable().optional().catch(null),
  missingInfo: MissingInfoSchema
});

// A safe fallback object when parsing completely fails
export function getSafeExtractionFallback(message: string): z.infer<typeof ExtractionResultSchema> {
  return {
    intent: "UNKNOWN",
    intentConfidence: 0.0,
    situation: {
      recipient: "UNKNOWN",
      recipient_type: "UNKNOWN",
      occasion: "UNKNOWN",
      urgency: "LOW",
      budget: { currency: "LKR", is_flexible: true }
    },
    psychology: {
      primaryTrigger: "UNKNOWN",
      emotionalIntensity: 5
    },
    product_type: "UNKNOWN",
    mapped_category: "UNKNOWN",
    interaction_mode: "DISCOVERY",
    action: "SEARCH",
    search_sufficiency_score: 0.0,
    recommendation_mode: "FAST",
    preference_corrections: [],
    extracted_memory: null,
    missingInfo: {
      isMissingCriticalInfo: false,
      missingFields: []
    }
  };
}
