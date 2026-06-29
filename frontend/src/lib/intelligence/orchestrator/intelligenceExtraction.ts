import OpenAI from 'openai';
import { ExtractionResult } from '../types/intelligence.types';
import { IntelligenceTracer } from '../observability/tracer';
import { ExtractionResultSchema, getSafeExtractionFallback } from '../validation/schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_SCHEMA = {
  name: "extract_intelligence_context",
  description: "Extracts deep semantic understanding from a user's commerce request.",
  parameters: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: ["SHOPPING", "GIFTING", "REORDER", "BROWSING", "DELIVERY", "TRACKING", "COMPLAINT", "SMALL_TALK", "PREFERENCE_CORRECTION", "PRICE_REFINEMENT", "EXPLORATION", "SOCIAL", "EMOTIONAL_SUPPORT", "FRUSTRATION", "LIFE_EVENT", "UNKNOWN"],
        description: "The primary intent of the user. Use GIFTING if the user mentions buying a gift or looking for gift ideas/recommendations. Use EXPLORATION if the user explicitly says they don't know what they want. Use SOCIAL, EMOTIONAL_SUPPORT, FRUSTRATION, or LIFE_EVENT if they are venting, sharing personal details or expressing emotions (e.g. 'gf is angry', 'failed exam', 'had a fight')."
      },
      intentConfidence: {
        type: "number",
        description: "Confidence in the intent classification (0-1)."
      },
      situation: {
        type: "object",
        properties: {
          recipient: { type: "string", description: "Who is this for? e.g., 'father', 'wife', 'friend', 'self'. MUST be translated to standard English (e.g. 'appachi' -> 'father', 'nangi' -> 'sister'). Output 'UNKNOWN' if not specified." },
          recipient_type: { type: "string", enum: ["FAMILY", "FRIEND", "ROMANTIC", "COLLEAGUE", "ACQUAINTANCE", "SELF", "UNKNOWN"] },
          occasion: { type: "string", description: "Why are they buying this? e.g., 'birthday', 'anniversary'. MUST be translated to standard English. Output 'UNKNOWN' if not specified." },
          urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "IMMEDIATE"] },
          budget: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              currency: { type: "string", default: "LKR" },
              is_flexible: { type: "boolean", default: true }
            },
            required: ["currency", "is_flexible"]
          },
          location: { type: "string", description: "Target delivery location if mentioned." },
          delivery_requirements: { type: "string" }
        },
        required: ["recipient", "recipient_type", "occasion", "urgency", "budget"]
      },
      psychology: {
        type: "object",
        properties: {
          primaryTrigger: {
            type: "string",
            enum: ["APPRECIATION", "LOVE", "APOLOGY", "GUILT", "OBLIGATION", "CELEBRATION", "SYMPATHY", "UNKNOWN"]
          },
          secondaryTrigger: {
            type: "string",
            enum: ["APPRECIATION", "LOVE", "APOLOGY", "GUILT", "OBLIGATION", "CELEBRATION", "SYMPATHY", "UNKNOWN"]
          },
          emotionalIntensity: {
            type: "number",
            description: "Scale 1-10 of how emotional this purchase is (e.g., funeral or big apology is 10, casual self-buy is 1)."
          }
        },
        required: ["primaryTrigger", "emotionalIntensity"]
      },
      product_type: {
        type: "string",
        description: "The specific product the user wants to buy (e.g., 'cream cracker biscuits', 'whiskey', 'flower bouquet'). MUST be translated to English. MUST fix spelling mistakes (e.g., 'biscuts' -> 'biscuits'). If none specified, output 'UNKNOWN'."
      },
      mapped_category: {
        type: "string",
        enum: ["CAKES", "CHOCOLATES", "CLOTHING", "ELECTRONICS", "FLOWERS", "GROCERY", "JEWELRY_WATCHES", "PERSONALIZED_GIFTS", "FASHION_SHOES", "HEALTH_WELLNESS", "TOYS", "HAMPERS", "BOOKS", "UNKNOWN"],
        description: "Map the user's natural query to an official Kapruka root category. If unsure, output 'UNKNOWN'."
      },
      interaction_mode: {
        type: "string",
        enum: ["DISCOVERY", "RECOMMENDATION", "REFINEMENT"],
        description: "DISCOVERY: user wants to browse options/examples. RECOMMENDATION: user needs help choosing a single best item. REFINEMENT: filtering an existing list."
      },
      action: {
        type: "string",
        enum: ["SEARCH", "SHOW_MORE", "RECALL_PREVIOUS_RESULTS"],
        description: "Use SEARCH for new requests. Use SHOW_MORE to see next page. Use RECALL_PREVIOUS_RESULTS for 'where is the list', 'show me those again'."
      },
      search_sufficiency_score: {
        type: "number",
        description: "0.0 to 1.0. How sufficient is the current information to perform a search? 0.9 for 'juice under 500'. 0.1 for 'I need something nice'."
      },
      recommendation_mode: {
        type: "string",
        enum: ["FAST", "PRECISION"],
        description: "Use PRECISION if the user says: 'Can you help me choose?', 'What is the best option?', 'I don't know what to buy.', 'Recommend something meaningful'. Otherwise, use FAST."
      },
      preference_corrections: {
        type: "array",
        description: "List of user preference corrections, e.g. 'No mugs', 'Avoid flowers', 'Dad hates coffee', 'Not a huge fan of books'. Extract these when the user is refining their preferences for the current recommendation pool.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["CATEGORY", "PRODUCT_TYPE", "RECIPIENT_PREFERENCE", "STYLE"] },
            target: { type: "string", description: "The specific item/category being referenced, e.g. 'mugs', 'coffee', 'books'" },
            negative: { type: "boolean", description: "True if they dislike or want to avoid it" },
            strength: { type: "string", enum: ["SOFT", "HARD"], description: "HARD for 'no mugs', 'remove books'. SOFT for 'maybe not mugs', 'prefer something else'." },
            recipient: { type: "string", description: "Who this preference belongs to, if specified (e.g. 'mother', 'dad')" }
          },
          required: ["type", "target", "negative", "strength"]
        }
      },
      price_refinement: {
        type: "object",
        description: "Populate if user wants to filter or sort the current products by price (e.g., 'under 5000', 'around 3000', 'budget friendly', 'luxury', 'between 3k and 8k').",
        properties: {
          sort_order: { type: "string", enum: ["ASC", "DESC", "CHEAPER", "PREMIUM"], description: "Use CHEAPER for 'budget friendly/affordable' (relevance-aware), ASC for 'lowest first' (absolute), PREMIUM for 'luxury', DESC for 'highest first'." },
          min_price: { type: "number" },
          max_price: { type: "number" },
          target_price: { type: "number", description: "Use for 'around 5000'." },
          price_band: { type: "string", enum: ["BUDGET", "MID", "PREMIUM", "LUXURY"] }
        }
      },
      extracted_memory: {
        type: "object",
        description: "Populate this if the user shares ANY personal details, likes, dislikes, family members, habits, or relationship details. E.g. 'for my brother', 'dad loves golf', 'I hate chocolate'.",
        properties: {
          category: { type: "string", enum: ["preference", "behavior", "relationship", "general"] },
          relationship: { type: "string", description: "The person this memory is about, e.g. 'brother', 'mother', 'self', 'friend'." },
          interest: { type: "string", description: "What they like or dislike. Use 'Dislikes: [item]' for negative preferences." },
          behavioral_trait: { type: "string", description: "A personality trait or shopping habit." },
          general_note: { type: "string" },
          confidence: { type: "number", description: "Confidence score 0.0 to 1.0" }
        },
        required: ["category"]
      },
      new_slang_detected: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slang_word: { type: "string", description: "The local slang word used (e.g., 'loku', 'appachi', 'arakku')" },
            standard_english: { type: "string", description: "The standard English meaning (e.g., 'older brother', 'father', 'liquor')" },
            category: { type: "string", enum: ["RELATIONSHIP", "PRODUCT", "OCCASION", "OTHER"] }
          },
          required: ["slang_word", "standard_english", "category"]
        },
        description: "If the user explicitly teaches or corrects you on a local slang word (e.g. 'loku means brother', 'appachi is father'), extract it here so the community can learn it."
      },
      missingInfo: {
        type: "object",
        properties: {
          isMissingCriticalInfo: {
            type: "boolean",
            description: "True if Minimum Viable Context (MVC) is not met. MVC Rules: For Gifting, require Recipient OR Occasion. For Food/Shopping, require Product Type. For Reorder, require Reorder Intent. If MVC is met, this is false."
          },
          missingFields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                priority: { type: "number", description: "1 is highest priority" }
              },
              required: ["field", "priority"]
            },
            description: "List of missing fields ranked by priority to ask."
          },
          suggestedQuestion: {
            type: "string",
            description: "A natural, friendly question to ask the user to get the HIGHEST priority missing information."
          }
        },
        required: ["isMissingCriticalInfo", "missingFields"]
      }
    },
    required: ["intent", "intentConfidence", "situation", "psychology", "product_type", "mapped_category", "interaction_mode", "action", "search_sufficiency_score", "recommendation_mode", "missingInfo"]
  }
};

export async function runIntelligenceExtraction(
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  tracer: IntelligenceTracer,
  lexiconString: string = ""
): Promise<ExtractionResult> {
  const trace = tracer.startTrace('IntelligenceExtraction', { userMessage });

  try {
    const messages: any[] = [
      {
        role: "system",
        content: `You are the Kapruka Intelligence Engine. Your job is to deeply understand the user's commerce request.
You must extract the Intent, Situation, Psychology, and any Missing Information.
Always analyze if the user is gifting or buying for themselves.
${lexiconString ? `\nAPPROVED COMMUNITY LEXICON (Use these mappings):\n${lexiconString}\n` : ""}

If the user is venting, complaining about life, or sharing emotional/social situations (e.g. "my girlfriend is angry with me", "I failed my exam", "I had a big fight with my wife", "I am so stressed"), classify the intent as one of:
- SOCIAL (general social updates or relationships)
- EMOTIONAL_SUPPORT (seeking comfort, venting, emotional distress)
- FRUSTRATION (expressing anger, annoyance, or disappointment)
- LIFE_EVENT (milestones, exams, breakups, fights, celebrations)
For these social distress/venting intents, set search_sufficiency_score to 0.0 and product_type to "UNKNOWN". Do NOT immediately trigger a product search. Keep the conversation warm and validating first, keeping the possibility of commerce/gifting open for later.

If the user mentions buying a gift or looking for gift ideas/recommendations, the intent MUST be classified as GIFTING (even if recipient and occasion are not yet specified).
If the user corrections or refines a previous recommendation (e.g., "No mugs", "My dad hates coffee", "Avoid flowers"), set intent to PREFERENCE_CORRECTION and populate preference_corrections array.
If the user says they don't know what they want, have no idea, want a surprise, just show them something, or any variant indicating no specific product target, set intent to EXPLORATION. Examples: "I have no idea what I want", "surprise me", "just show me something", "idk", "I'm not sure", "help me decide", "no clue".
If the user wants to filter or sort by price (e.g., "Under 5000", "Around 3000", "Show budget gifts", "Sort low to high"):
- If they are filtering an EXISTING pool of recommendations, set intent to PRICE_REFINEMENT.
- If this is a FRESH search (e.g., "list some juice items under 500", "I need a phone around 50000"), the intent MUST be SHOPPING or GIFTING, but you should STILL populate the price_refinement object.
If the user is answering a question, describing features, specifications, or details of the product they want (e.g., "It should hold the rod", "blue color", "cotton material", "under 5000 LKR"), they are refining their search. In this case, you MUST classify the intent as SHOPPING (or GIFTING if it's a gift request) and carry over the product_type from the conversation history if it is not explicitly mentioned in the current turn (e.g., if they previously wanted a shower caddy, set product_type to "shower caddy" or "hangable container").
If the request is a continuation request (e.g., "show more", "more products", "cheaper ones", "compare", "add item", "next page", "go on"), identify this as a continuation/refinement:
- Set action to "SHOW_MORE" or "RECALL_PREVIOUS_RESULTS".
- Set interaction_mode to "REFINEMENT" or "DISCOVERY".
- Set search_sufficiency_score to 1.0.
- Carry over the product_type, recipient, occasion, and budget from previous turns in the history.
- Set isMissingCriticalInfo to false since the shopping context is already established in history.
CRITICAL: Always map the request to the most appropriate 'mapped_category'. Example: 'healthy snacks' -> 'GROCERY'. 'birthday cake' -> 'CAKES'.
Minimum Viable Context (MVC) Rules:
- Gifting: MVC is met if Recipient OR Occasion is present. CRITICAL EXCEPTION: If the product is highly age-dependent (e.g., "toys", "clothing for child/daughter/son") and age is NOT mentioned, MVC is NOT met. Set isMissingCriticalInfo to true and ask for the age. If the recipient is a generic title (e.g., "professor", "doctor", "boss", "colleague") and gender is NOT mentioned, MVC is NOT met. Set isMissingCriticalInfo to true and ask for their gender or preferences.
- Food/Grocery/Shopping: MVC is met if Product Type is present.
- Reorder: MVC is met if Reorder Intent is present.
- Preference Correction / Price Refinement / Social: MVC is met.
If MVC is not met, mark isMissingCriticalInfo as true.
Do NOT hallucinate information. If something is unknown, mark it as UNKNOWN.
CRITICAL RULE ON SLANG: If the user explicitly teaches you a new word, slang, or translation (e.g. "zorp means cake", "appachi is father"), you MUST extract it into the 'new_slang_detected' array. Do NOT place vocabulary lessons into 'extracted_memory'.
CRITICAL RULE: "Earn the right to ask questions". Do NOT ask for Recipient or Occasion if the user just asks for "juice" or a simple product. Only ask questions if they materially improve the recommendation (like age for toys, or gender for a professor).`
      },
      ...chatHistory.map(msg => ({ role: msg.role, content: msg.content || "" })),
      { role: "user", content: userMessage || "" }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [{ type: "function", function: EXTRACTION_SCHEMA }],
      tool_choice: { type: "function", function: { name: "extract_intelligence_context" } },
      temperature: 0.1,
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Failed to extract intelligence context");
    }

    const rawArgs = JSON.parse(toolCall.function.arguments);
    
    // Zod Response Schema Validation
    const parsed = ExtractionResultSchema.safeParse(rawArgs);
    if (!parsed.success) {
      console.warn("Zod schema validation failed for LLM extraction output:", parsed.error);
      const fallback = getSafeExtractionFallback(userMessage);
      trace.end(fallback, 0.0, "Validation failed; applied safe fallback state");
      return fallback as any as ExtractionResult;
    }
    
    const extractedData = parsed.data as any as ExtractionResult;
    trace.end(extractedData, extractedData.intentConfidence || 1.0, "Successfully extracted and validated context via LLM");
    return extractedData;
    
  } catch (error: any) {
    console.error("runIntelligenceExtraction encountered an error, applying fallback:", error);
    const fallback = getSafeExtractionFallback(userMessage);
    trace.end(fallback, 0.0, `Extraction failed with error: ${error.message}; fallback applied`);
    return fallback as any as ExtractionResult;
  }
}
