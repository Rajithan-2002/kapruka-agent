import OpenAI from "openai";
import { StreamData, StreamingTextResponse, OpenAIStream } from "ai";
import { NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/services/profileService";
import { getRelationships, getPreferences, getMemories, addMemory, addPreference, addRelationship } from "@/lib/services/memoryService";
import { buildUserContext } from "@/lib/services/personalizationService";
import { saveChatMessage, getRecentChatHistory, updateUserTone, getUserTone } from "@/lib/services/chatHistoryService";
import { recordInteraction, getBehaviorProfile } from "@/lib/services/behaviorProfileService";
import { getPurchaseHistory, searchPurchases } from "@/lib/services/purchaseHistoryService";
import { getOrCreateJourney, updateJourneyStages } from "@/lib/services/shoppingJourneyService";
import { validateProducts, LifecycleLog } from "@/lib/recommendationValidator";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_USER_ID } from "@/lib/db";
import {
    mcpSearchProducts,
    mcpTrackOrder,
    mcpCheckDelivery,
    mcpGetProduct,
    mcpListCategories,
    mcpListDeliveryCities
} from "@/lib/mcp";
import { saveSearchSession, getSearchSession } from "@/lib/services/searchSessionsService";
import { generateBundleOptions } from "@/lib/bundle";
import { craftGiftMessageOptions } from "@/lib/giftMessage";
import {
    rankProducts,
    RecommendationContext
} from "@/lib/scoring";
import { createConversation, generateConversationTitle } from "@/lib/services/conversationsService";
import { deduplicateProducts } from "@/lib/deduplication";
import { getCategoryAliases } from "@/lib/intelligence/dictionaries/categoryAliases";
import { logCommunityAction } from "@/lib/intelligence/feedback/feedbackService";
import { translateSearchQuery } from "@/lib/translation";
import { ProductAdapter } from "@/lib/intelligence/types/ProductAdapter";
import { CanonicalProductV1 } from "@/lib/intelligence/types/CanonicalProduct";
import { TraceCollector } from "@/lib/intelligence/observability/traceCollector";
import { randomUUID } from "crypto";
import { godModeStorage } from "@/lib/intelligence/observability/godmode/storage";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { KAPPY_PERSONA_INSTRUCTION } from "@/lib/masterPrompt";
import { DetectedPersona } from "@/lib/intelligence/state/sessionSnapshot";

interface CachedVocabulary {
    singlish: string[];
    tanglish: string[];
}

let vocabCache: CachedVocabulary | null = null;
let lastVocabFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchVocabularyCached(): Promise<CachedVocabulary> {
    const now = Date.now();
    if (vocabCache && (now - lastVocabFetchTime < CACHE_TTL)) {
        return vocabCache;
    }

    const defaultSinglish = [
        "machan", "machang", "ado", "hari", "eka", "mama", "mata", "aiyo", "ane", "patta", 
        "ela", "ne", "one", "karanna", "tiyenawa", "tiyenawada", "puluwanda", "ayya", "kohomada", 
        "heta", "balapamu", "mokakda", "puluwan", "apita", "yako", "ow", "nehe",
        "nangi", "malli", "salli", "nenda", "kella", "kolla", "badu", "wade", "wada", "mokak", "kiyanna", "epa", "ganna"
    ];
    const defaultTanglish = [
        "machan", "machang",
        "macha", "da", "daa", "thala", "evlo", "romba", "nanba", "sari", "illa", "enna", "ena", "amma ku", 
        "venum", "naalaikku", "deliver aaguma", "budget kammiya", "paakalama", "sollunga", 
        "pannuven", "kaakalam", "irukku", "iruku", "thane", "vaanginoam", "paakattuma", "kammiya",
        "vanakam", "vanakkam", "saamaan", "maapley", "maapleyy", "maaplay", "maaplai", "ithu", 
        "akkama", "thambi", "kaasu", "ponnu", "paiyan", "irukka", "illai", "kuda", "kooda", "pannunga", "vaanga",
        "vaangalam", "vaanganum", "pudikum", "varuthu", "avanukku", "ku", "enda"
    ];

    try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("kappy_vocabulary")
            .select("word, language_family");

        if (error || !data || data.length === 0) {
            console.warn("[Vocabulary Cache] Failed to load from database, using hardcoded fallback. Error:", error?.message);
            vocabCache = { singlish: defaultSinglish, tanglish: defaultTanglish };
        } else {
            const singlish: string[] = [];
            const tanglish: string[] = [];
            data.forEach((row: any) => {
                if (row.language_family === 'singlish') {
                    singlish.push(row.word.toLowerCase());
                } else if (row.language_family === 'tanglish') {
                    tanglish.push(row.word.toLowerCase());
                }
            });
            vocabCache = { singlish, tanglish };
            console.log(`[Vocabulary Cache] Loaded ${singlish.length} Singlish and ${tanglish.length} Tanglish words from database.`);
        }
    } catch (err: any) {
        console.error("[Vocabulary Cache] Exception during database fetch, using fallbacks:", err.message);
        vocabCache = { singlish: defaultSinglish, tanglish: defaultTanglish };
    }

    lastVocabFetchTime = now;
    return vocabCache;
}

let lexiconCache: string | null = null;
let lastLexiconFetchTime = 0;
const LEXICON_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCommunityLexiconCached(): Promise<string> {
    const now = Date.now();
    if (lexiconCache !== null && (now - lastLexiconFetchTime < LEXICON_CACHE_TTL)) {
        return lexiconCache;
    }

    try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("kappy_community_lexicon")
            .select("slang_word, standard_english")
            .eq("status", "APPROVED");

        if (!error && data && data.length > 0) {
            lexiconCache = data.map(r => `${r.slang_word} -> ${r.standard_english}`).join(", ");
        } else {
            lexiconCache = "";
        }
    } catch (err) {
        console.error("[Community Lexicon] Exception fetching approved lexicon:", err);
        lexiconCache = "";
    }

    lastLexiconFetchTime = now;
    return lexiconCache;
}

async function detectPersonaFromMessage(msg: string): Promise<DetectedPersona> {
    const msgLower = msg.toLowerCase();
    const hasSinhalaUnicode = /[\u0D80-\u0DFF]/.test(msg);
    const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(msg);

    const vocab = await fetchVocabularyCached();
    const singlishWords = vocab.singlish;
    const tanglishWords = vocab.tanglish;

    const words = msgLower.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9\u0D80-\u0DFF\u0B80-\u0BFF]/g, "")).filter(Boolean);

    let singlishScore = 0;
    let tanglishScore = 0;

    words.forEach(w => {
        if (singlishWords.includes(w)) {
            singlishScore++;
        }
        if (tanglishWords.includes(w)) {
            tanglishScore++;
        }
    });

    if (msgLower.includes("amma ta") || msgLower.includes("deliver karanna") || msgLower.includes("gift ekak")) {
        singlishScore += 2;
    }
    if (msgLower.includes("amma ku") || msgLower.includes("deliver aaguma") || msgLower.includes("gift venum")) {
        tanglishScore += 2;
    }

    const hasSinglish = singlishScore > 0 && singlishScore >= tanglishScore;
    const hasTanglish = tanglishScore > 0 && tanglishScore > singlishScore;

    let primaryLanguage: 'English' | 'Singlish' | 'Tanglish' | 'Tamil' | 'Sinhala' | 'Mixed English + Tamil' | 'Mixed English + Singlish' = "English";
    let scriptType: 'roman' | 'unicode_sinhala' | 'unicode_tamil' = "roman";
    let mixingRatio = 0.0;

    const englishVerbsAndPreps = ["show", "buy", "find", "get", "need", "want", "like", "love", "for", "to", "in", "on", "at", "please", "could", "would", "is", "are", "am"];
    const hasEnglishStructure = words.some(w => englishVerbsAndPreps.includes(w));

    if (hasSinhalaUnicode) {
        primaryLanguage = "Sinhala";
        scriptType = "unicode_sinhala";
        const englishWordCount = (msg.match(/[a-zA-Z]+/g) || []).length;
        const totalWords = words.length;
        if (englishWordCount > 0 && totalWords > 0) {
            mixingRatio = englishWordCount / totalWords;
        }
    } else if (hasTamilUnicode) {
        primaryLanguage = "Tamil";
        scriptType = "unicode_tamil";
        const englishWordCount = (msg.match(/[a-zA-Z]+/g) || []).length;
        const totalWords = words.length;
        if (englishWordCount > 0 && totalWords > 0) {
            mixingRatio = englishWordCount / totalWords;
        }
    } else if (hasSinglish) {
        const englishWordCount = words.filter(w => !singlishWords.includes(w) && !["a", "an", "the", "for", "to", "in", "is", "it", "of", "my", "need", "gift", "birthday", "she", "he", "they"].includes(w)).length;
        const totalWords = words.length;
        mixingRatio = totalWords > 0 ? (totalWords - englishWordCount) / totalWords : 0.0;
        
        if (hasEnglishStructure && mixingRatio < 0.8) {
            primaryLanguage = "Mixed English + Singlish";
        } else {
            primaryLanguage = "Singlish";
        }
    } else if (hasTanglish) {
        const englishWordCount = words.filter(w => !tanglishWords.includes(w) && !["a", "an", "the", "for", "to", "in", "is", "it", "of", "my", "need", "gift", "birthday", "she", "he", "they"].includes(w)).length;
        const totalWords = words.length;
        mixingRatio = totalWords > 0 ? (totalWords - englishWordCount) / totalWords : 0.0;
        
        if (hasEnglishStructure && mixingRatio < 0.8) {
            primaryLanguage = "Mixed English + Tamil";
        } else {
            primaryLanguage = "Tanglish";
        }
    } else {
        primaryLanguage = "English";
        scriptType = "roman";
        mixingRatio = 0.0;
    }

    // Formality level
    let formality: 'formal' | 'casual' | 'very_casual' = "casual";
    const formalKeywords = ["please", "would", "could", "assistance", "regards", "dear", "recommend", "options", "purchase", "available", "delivery"];
    const informalKeywords = ["hey", "yo", "machan", "ado", "macha", "bro", "watsup", "whats", "gimme", "wanna", "gonna", "idk", "asap", "enna", "panra", "macha", "thala"];

    const formalScore = words.filter(w => formalKeywords.includes(w)).length;
    const informalScore = words.filter(w => informalKeywords.includes(w)).length;

    if (formalScore > informalScore && formalScore > 0) {
        formality = "formal";
    } else if (informalScore > formalScore || msgLower.includes("machan") || msgLower.includes("ado") || msgLower.includes("macha") || msgLower.includes("bro")) {
        formality = "very_casual";
    }

    // Energy level
    let energy: 'high' | 'medium' | 'low' = "medium";
    const exclamationCount = (msg.match(/!/g) || []).length;
    const emojiCount = (msg.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu) || []).length;
    const capsCount = (msg.match(/\b[A-Z]{3,}\b/g) || []).length;

    if (exclamationCount > 1 || emojiCount > 2 || capsCount > 1 || msg.includes("ASAP") || msg.includes("TODAY")) {
        energy = "high";
    } else if (msg.length < 20 && exclamationCount === 0 && emojiCount === 0) {
        energy = "low";
    }

    // Tone Type & Emotional / Sarcastic Detection
    let tone: 'polite' | 'funny' | 'sarcastic' | 'urgent' | 'confused' | 'friendly' | 'playful' | 'serious' = "friendly";

    const sadStressedKeywords = ["cry", "crying", "sad", "stressed", "sorry", "guilty", "apology", "apologize", "angry", "fight", "broke", "expensive", "cheaper"];
    const sarcasticKeywords = ["wallet is crying", "life become", "judge me", " savior", " crime", "angry for 3 days"];
    const urgentKeywords = ["urgent", "emergency", "asap", "today", "now", "immediately", "quick"];
    const confusedKeywords = ["don't know", "not sure", "help me", "no idea", "confused", "what to get", "any ideas"];
    const funnyKeywords = ["haha", "hehe", "lol", "joke", "funny"];

    if (sarcasticKeywords.some(k => msgLower.includes(k))) {
        tone = "sarcastic";
    } else if (confusedKeywords.some(k => msgLower.includes(k))) {
        tone = "confused";
    } else if (urgentKeywords.some(k => msgLower.includes(k))) {
        tone = "urgent";
    } else if (sadStressedKeywords.some(k => msgLower.includes(k))) {
        tone = "serious";
    } else if (funnyKeywords.some(k => msgLower.includes(k))) {
        tone = "funny";
    } else if (formality === "formal") {
        tone = "polite";
    } else if (formality === "very_casual") {
        tone = "playful";
    }

    // Slang detected
    const detected_slang = words.filter(w => [...singlishWords, ...tanglishWords].includes(w));

    return {
        primary_language: primaryLanguage,
        script_type: scriptType,
        formality,
        energy,
        tone,
        mixing_ratio: parseFloat(mixingRatio.toFixed(2)),
        detected_slang
    };
}

export async function POST(request: Request) {
    let requestBody: any = {};
    try {
        requestBody = await request.json();
    } catch (e: any) {
        import('fs').then(fs => fs.writeFileSync('hard_crash.log', e.stack || e.message));
        return new NextResponse(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    try {
        const { sessionId, godModeEnabled } = requestBody;
    const isSampled = !godModeEnabled && Math.random() < Number(process.env.TELEMETRY_SAMPLING_RATE || 0.001);

    const traceId = randomUUID();
    const decisionId = randomUUID();
    const traceStartTime = Date.now();

    const supabase = await createClient();
    let userId = FALLBACK_USER_ID;
    let userName = "friend";
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
            const firstName = fullName ? fullName.split(" ")[0] : "";
            userName = firstName || "friend";
        }
    } catch (_) {}

    const activeSessionId = sessionId || `session-${Date.now()}`;

    // Always execute inside God Mode storage context so telemetry is captured for every interaction
    const context = {
        traceId,
        userId,
        enabled: true,
        telemetryEvents: [],
        productLifecycles: {},
        replaySteps: [],
        confidenceFactors: { positive: [], negative: [] },
        sessionSummary: {},
        engineHealth: {},
        startTime: traceStartTime
    };
    return await godModeStorage.run(context, async () => 
        await processPostRequest(requestBody, userId, userName, activeSessionId, traceId, decisionId, traceStartTime, !!godModeEnabled, isSampled)
    );
    } catch (e: any) {
        import('fs').then(fs => fs.writeFileSync('hard_crash.log', e.stack || e.message));
        return NextResponse.json({ error: "Hard crash", details: e.message }, { status: 500 });
    }
}

async function processPostRequest(
    requestBody: any,
    userId: string,
    userName: string,
    activeSessionId: string,
    traceId: string,
    decisionId: string,
    traceStartTime: number,
    godModeEnabled: boolean,
    isSampled: boolean
) {
    const sessionTraces: any[] = [];
    const { message, history, godModeFilters } = requestBody;

    try {
        const { CircuitBreaker } = await import("@/lib/intelligence/services/circuitBreaker");
        const circuitState = CircuitBreaker.getState();
        
        if (circuitState === "EMERGENCY") {
            const emergencyResponse = {
                role: "assistant",
                content: "I'm running in degraded safe mode right now 😅 How can I help you browse Kapruka today?",
                traceReport: {
                    trace_id: traceId,
                    success: false,
                    error_type: "circuit_breaker_emergency",
                    user_message: "I'm running in degraded safe mode right now 😅 How can I help you browse Kapruka today?",
                    recoverable: true
                },
                judgeModeTrace: {
                    timeline: [
                        { stepIndex: 1, title: "Circuit Breaker", description: "EMERGENCY state active. Bypass processing.", durationMs: 0, status: "ERROR" }
                    ],
                    featureFlags: { personalization: false, memories: false, circuitBreaker: true },
                    totalDurationMs: 0,
                    confidences: { intent: 0.1, memory: 0.1, recommendation: 0.1 }
                }
            };
            return new NextResponse(JSON.stringify(emergencyResponse), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Record interaction for progressive relationship building
        await recordInteraction(userId);

        let rawMemories: any[] = [];
        let rawProfile: any = null;
        let rawRelationships: any[] = [];
        let rawPreferences: any[] = [];
        let rawBehaviorProfile: any = null;
        let userContextBlock = "";
        let purchases: any[] = [];

        const dbStartTime = Date.now();
        try {
            if (circuitState === "DEGRADED") {
                console.warn("[CircuitBreaker] DEGRADED state. Skipping personalization DB fetches.");
                rawMemories = [];
                rawProfile = { primary_language: "singlish", communication_style: "casual", average_budget: 6000 };
                rawRelationships = [];
                rawPreferences = [];
                rawBehaviorProfile = { favorite_categories: [], favorite_price_range: { min: 0, max: 0, avg: 0 }, total_purchases: 0, total_interactions: 0, relationship_strength: 0, personality_stage: 'new_acquaintance' };
                userContextBlock = "Degraded mode active. Personalization skipped.";
                purchases = [];
            } else {
                rawMemories = (await getMemories(userId)) || [];
                rawProfile = await getProfile(userId);
                rawRelationships = (await getRelationships(userId)) || [];
                rawPreferences = (await getPreferences(userId)) || [];
                rawBehaviorProfile = await getBehaviorProfile(userId);
                userContextBlock = await buildUserContext(userId);
                purchases = (await getPurchaseHistory(userId, 10)) || [];
            }
            CircuitBreaker.recordSuccess(Date.now() - dbStartTime);
        } catch (dbError) {
            console.error("Database fetch failure inside route.ts, triggering Circuit Breaker:", dbError);
            CircuitBreaker.recordFailure();
            rawMemories = [];
            rawProfile = { primary_language: "singlish", communication_style: "casual", average_budget: 6000 };
            rawRelationships = [];
            rawPreferences = [];
            rawBehaviorProfile = { favorite_categories: [], favorite_price_range: { min: 0, max: 0, avg: 0 }, total_purchases: 0, total_interactions: 0, relationship_strength: 0, personality_stage: 'new_acquaintance' };
            userContextBlock = "Degraded mode active due to database error.";
            purchases = [];
        }

        const { MemoryConflictResolver } = await import("@/lib/intelligence/memory/conflictResolver");
        const { MemoryDecayEngine } = await import("@/lib/intelligence/memory/decayEngine");
        const { MemoryRelevanceEngine } = await import("@/lib/intelligence/memory/relevanceEngine");
        const { MemoryPresentationLayer } = await import("@/lib/intelligence/memory/presentationLayer");

        // 1. Resolve Conflicts
        const resolvedMemories = MemoryConflictResolver.resolve(rawMemories);

        // 2. Apply Decay
        const decayedMemories = resolvedMemories.map(m => MemoryDecayEngine.applyDecay(m));

        // 3. Rank Relevance — auto-classify context from message (GIFT / REORDER / TRACKING / etc.)
        // Combine both conversation memories AND preference records so both are ranked
        const allMemoryItems = [...decayedMemories, ...rawPreferences];
        const relevanceResult = MemoryRelevanceEngine.rankMemories(message, allMemoryItems);

        // Map relevant memories to Context Tags using Presentation Layer
        let activeContextTags = relevanceResult.relevantMemories.map(m => {
            const rendered = MemoryPresentationLayer.renderMemory(m);
            return `${rendered.category}: ${rendered.text}`;
        });

        // Log memory usage for God Mode — cover both memories and preferences
        const { LearningEvidenceService } = await import("@/lib/intelligence/observability/godmode/learningEvidenceService");
        allMemoryItems.forEach(m => {
            const isUsed = relevanceResult.relevantMemories.some(rm => rm.id === m.id);
            const rendered = MemoryPresentationLayer.renderMemory(m);
            const memoryText = rendered.text;
            LearningEvidenceService.logMemoryUsage(
                memoryText, 
                isUsed ? "USED" : "IGNORED", 
                isUsed ? "Confidence score meets relevance threshold" : "Low semantic alignment with query"
            );
        });


        const memoryTrace = await TraceCollector.logExecution(
            traceId,
            decisionId,
            "MEMORY",
            Date.now() - traceStartTime,
            { query: message, rawMemoryCount: rawMemories.length },
            { 
                loadedCount: rawMemories.length, 
                selectedCount: relevanceResult.relevantMemories.length,
                maxConfidence: relevanceResult.relevantMemories.length > 0 ? 0.9 : 0 
            },
            circuitState === "DEGRADED" ? "DEGRADED" : "HEALTHY"
        );
        sessionTraces.push(memoryTrace);

        const { GodTelemetryService } = await import("@/lib/intelligence/observability/godmode/telemetryService");
        GodTelemetryService.emit("MEMORY", "COMPLETED", {
            loadedCount: rawMemories.length,
            selectedCount: relevanceResult.relevantMemories.length,
            confidence: relevanceResult.relevantMemories.length > 0 ? 0.9 : 0
        });

        // Run through Profile Normalizer Gateway
        const { normalizeUserContext } = await import("@/lib/intelligence/normalization/profileNormalizer");
        const normalizedContext = normalizeUserContext({
            userProfile: rawProfile,
            behaviorProfile: rawBehaviorProfile,
            relationships: rawRelationships,
            preferences: rawPreferences,
            memories: rawMemories
        });

        // Re-assign normalized context as downstream constants
        const profile = normalizedContext.userProfile;
        const relationships = normalizedContext.relationships;
        const preferences = normalizedContext.preferences;
        const memories = normalizedContext.memories;
        const behaviorProfile = normalizedContext.behaviorProfile;

        const userTone = await getUserTone(userId);

        // Chat history is now loaded conditionally below based on Understanding Engine.

        const chatHistoryContext = history && Array.isArray(history)
            ? history.map((h: { role: string; content: string }) => `${h.role === "user" ? "User" : "Kappy"}: ${h.content}`).join("\n")
            : "";

        // Ensure conversation exists in DB
        let initialTitle = message.trim();
        if (initialTitle.length > 25) {
            initialTitle = initialTitle.substring(0, 25) + "...";
        }
        if (!initialTitle) initialTitle = "Shopping Chat";
        await createConversation(userId, activeSessionId, initialTitle);

        // Save the user's message to persistent chat history
        await saveChatMessage(userId, activeSessionId, "user", message, { intent: "pending" });

        // Trigger auto-titling for new chats (less than 2 messages in session history)
        if (!history || history.length <= 1) {
            generateConversationTitle(userId, activeSessionId, message).catch(console.error);
        }

        // Load snapshot earlier for pre-intent parsing and overrides
        const { SessionSnapshotEngine } = await import("@/lib/intelligence/state/sessionSnapshot");
        let snapshot = await SessionSnapshotEngine.loadSnapshot(activeSessionId);

        const { PreIntentParser } = await import("@/lib/intelligence/normalization/preIntentParser");
        const lastAssistantMessage = history && Array.isArray(history) && history.length > 0
            ? [...history].reverse().find((h: any) => h.role === "assistant")?.content || null
            : null;
        const preIntentResult = PreIntentParser.parse(message, history || [], lastAssistantMessage);

        // Normalize pre-classified intents
        if (preIntentResult.intent) {
            const intentUpper = preIntentResult.intent.toUpperCase();
            if (intentUpper.startsWith("GIFT_") || intentUpper.endsWith("_GIFT") || intentUpper.startsWith("RECIPIENT_")) {
                preIntentResult.intent = "GIFTING";
            } else if (intentUpper.endsWith("_SHOPPING") || intentUpper.endsWith("_PURCHASE") || intentUpper.includes("BUDGET")) {
                preIntentResult.intent = "SHOPPING";
            }
        }

        // 2. INTELLIGENCE ENGINE (V1)
        let intelligence: any;
        if (preIntentResult.pre_classified && preIntentResult.fallback === "NONE") {
            console.log(`[PreIntentParser] Pre-classified intent: ${preIntentResult.intent}`);
            intelligence = {
                readyForRecommendation: preIntentResult.intent === "PRODUCT_REJECTION" || preIntentResult.intent === "CHECKOUT_CONFIRM",
                intelligenceScore: 90,
                recommendationConfidence: 0.9,
                intent: preIntentResult.intent,
                situation: {
                    recipient: preIntentResult.slots.recipient || snapshot?.recipient || "UNKNOWN",
                    occasion: preIntentResult.slots.occasion || snapshot?.occasion || "UNKNOWN",
                    budget: preIntentResult.slots.budget ? { max: preIntentResult.slots.budget } : (snapshot?.budget ? { max: snapshot.budget } : null)
                },
                psychology: { primaryTrigger: "neutral" },
                product_type: snapshot?.searchSession?.query || "UNKNOWN",
                mapped_category: "UNKNOWN",
                preference_corrections: preIntentResult.intent === "PRODUCT_REJECTION" ? [{
                    target: preIntentResult.slots.exclusion_target,
                    negative: true,
                    strength: "HARD"
                }] : [],
                price_refinement: null,
                extracted_memory: null,
                traces: [
                    {
                        engine: "PreIntentParser",
                        latencyMs: 1,
                        reasoning: `Matched via normalization dictionary with confident score.`,
                        confidence: 0.95,
                        inputs: { message }
                    }
                ]
            };
        } else {
            const { IntelligenceOrchestrator } = await import("@/lib/intelligence/orchestrator/intelligenceOrchestrator");
            const orchestrator = new IntelligenceOrchestrator();
            const lexiconString = await fetchCommunityLexiconCached();
            intelligence = await orchestrator.processRequest(userId, message, history || [], lexiconString);
        }

        console.log("Kappy Intelligence Engine Plan:", JSON.stringify(intelligence, null, 2));

        if (intelligence && intelligence.traces) {
            for (const t of intelligence.traces) {
                const loggedTrace = await TraceCollector.logExecution(
                    traceId,
                    decisionId,
                    "UNDERSTANDING",
                    t.latencyMs || 0,
                    t.inputs || { message },
                    { reasoning: t.reasoning, confidence: t.confidence, original_engine: t.engine, intent: intelligence.intent },
                    "HEALTHY"
                );
                sessionTraces.push(loggedTrace);
            }

            const { GodTelemetryService } = await import("@/lib/intelligence/observability/godmode/telemetryService");
            GodTelemetryService.emit("UNDERSTANDING", "COMPLETED", {
                intent: intelligence.intent,
                confidence: intelligence.recommendationConfidence || 0.5
            });
        }

        // Create a backward-compatible understandingPlan for legacy route.ts logic
        const understandingPlan: any = {
            intent: intelligence.intent,
            is_shopping_request: ["SHOPPING", "GIFTING", "REORDER", "BROWSING", "PRICE_REFINEMENT", "PREFERENCE_CORRECTION", "EXPLORATION", "PRODUCT_REJECTION", "CHECKOUT_CONFIRM"].includes(intelligence.intent || ""),
            unsupported_domain: null,
            product_type: intelligence.product_type || "UNKNOWN",
            situation: intelligence.situation,
            extracted_product_type: { type: message, confidence: 1.0 }, // Fallback to raw message for search
            extracted_recipient: { type: intelligence.situation?.recipient !== "UNKNOWN" ? intelligence.situation?.recipient : null, confidence: 1.0 },
            extracted_occasion: { type: intelligence.situation?.occasion !== "UNKNOWN" ? intelligence.situation?.occasion : null, confidence: 1.0 },
            get recipient() { return this.extracted_recipient; },
            set recipient(val) { this.extracted_recipient = val; },
            get occasion() { return this.extracted_occasion; },
            set occasion(val) { this.extracted_occasion = val; },
            budget: intelligence.situation?.budget?.max ? { target: intelligence.situation.budget.max } : null,
            needs_history: false,
            emotion: intelligence.psychology?.primaryTrigger || "neutral",
            mapped_category: intelligence.mapped_category || "UNKNOWN",
            extracted_memory: intelligence.extracted_memory || null,
            new_slang_detected: intelligence.new_slang_detected || null,
            intelligenceData: intelligence
        };

        // --- Community Lexicon Pipeline: Auto-Save Slang ---
        if (understandingPlan.new_slang_detected && understandingPlan.new_slang_detected.length > 0) {
            try {
                const { createClient } = await import("@/lib/supabase/server");
                const supabaseClient = await createClient();
                
                for (const slang of understandingPlan.new_slang_detected) {
                    const cleanSlang = slang.slang_word.toLowerCase().trim();
                    const cleanEnglish = slang.standard_english.toLowerCase().trim();
                    
                    // Check if it already exists
                    const { data: existing } = await supabaseClient
                        .from('kappy_community_lexicon')
                        .select('id, votes')
                        .eq('slang_word', cleanSlang)
                        .eq('standard_english', cleanEnglish)
                        .single();

                    if (existing) {
                        const newVotes = existing.votes + 1;
                        const newStatus = newVotes >= 7 ? 'APPROVED' : 'PENDING';
                        await supabaseClient
                            .from('kappy_community_lexicon')
                            .update({ votes: newVotes, status: newStatus })
                            .eq('id', existing.id);
                    } else {
                        await supabaseClient
                            .from('kappy_community_lexicon')
                            .insert({
                                slang_word: cleanSlang,
                                standard_english: cleanEnglish,
                                category: slang.category,
                                votes: 1,
                                status: 'PENDING'
                            });
                    }
                }
            } catch (err) {
                console.error("[Community Lexicon] Failed to save detected slang:", err);
            }
        }
        // ---------------------------------------------------

        // Exploration Query Builder
        if (intelligence.intent === "EXPLORATION") {
            const favoriteCategories = behaviorProfile?.favorite_categories || [];
            const userPrefs = preferences || [];
            
            // Extract top categories and interests to formulate a personalized exploration query
            const categories = favoriteCategories.slice(0, 3);
            const interests = userPrefs
                .filter(p => p.interest && p.interest !== "UNKNOWN")
                .slice(0, 3)
                .map(p => p.interest);
                
            const queryTerms = [...categories, ...interests];
            let explorationQuery = "popular gifts";
            if (queryTerms.length > 0) {
                explorationQuery = queryTerms.join(" ");
            }
            
            // Override understandingPlan values
            understandingPlan.product_type = explorationQuery;
            understandingPlan.extracted_product_type = { type: explorationQuery, confidence: 1.0 };
            
            // Force intelligenceData properties
            if (understandingPlan.intelligenceData) {
                understandingPlan.intelligenceData.product_type = explorationQuery;
                understandingPlan.intelligenceData.readyForRecommendation = true;
                understandingPlan.intelligenceData.interaction_mode = "DISCOVERY";
                understandingPlan.intelligenceData.recommendation_mode = "FAST";
            }
        }

        // Hardcoded Intent mapping for UI Quick Tap Chips
        const exactMessage = message.trim();
        if (exactMessage.startsWith("Occasion:")) {
             const occName = exactMessage.replace("Occasion:", "").trim().toLowerCase();
             understandingPlan.intent = "GIFTING";
             understandingPlan.is_shopping_request = true;
             understandingPlan.product_type = "UNKNOWN";
             understandingPlan.occasion = { type: occName, confidence: 1.0 };
             if (understandingPlan.intelligenceData) {
                 understandingPlan.intelligenceData.intent = "GIFTING";
                 understandingPlan.intelligenceData.readyForRecommendation = true;
                 understandingPlan.intelligenceData.searchMode = "EXPLORATORY";
                 understandingPlan.intelligenceData.situation = {
                     ...understandingPlan.intelligenceData.situation,
                     occasion: occName
                 };
             }
        } else if (exactMessage === "🎂 Gift for someone") {
             understandingPlan.intent = "GIFTING";
             understandingPlan.is_shopping_request = true;
             understandingPlan.product_type = "UNKNOWN";
        } else if (exactMessage === "📦 Track my order") {
             understandingPlan.intent = "TRACK_ORDER";
             understandingPlan.is_shopping_request = false;
        } else if (exactMessage === "🔄 Reorder something") {
             understandingPlan.intent = "REORDER";
             understandingPlan.is_shopping_request = true;
             understandingPlan.product_type = "UNKNOWN";
        } else if (exactMessage === "Just browsing") {
             understandingPlan.intent = "BROWSING";
             understandingPlan.is_shopping_request = true;
             understandingPlan.product_type = "UNKNOWN";
        }

        // ------------------------------------------------------------
        // GREETING DETECTION & BYPASS (Sinhala, Tamil, English)
        // ------------------------------------------------------------
        const greetingKeywords = [
            // English
            "hi", "hii", "hiii", "hello", "helloo", "hey", "heyy", "heyyy", "yo", "yoo", "sup", "whats up", "whatsup", "greetings", "kappy", "kapri",
            "morning", "afternoon", "evening", "good morning", "good afternoon", "good evening",
            // Sinhala
            "ayubowan", "ayubowang", "subha dawasak", "subha udasanak", "subha sandhyawak", "machan", "machang", "ado", "kohomada", "sapa", "sapa kiyala", "koheda", "halow", "halo",
            // Tamil
            "vanakkam", "vanakam", "வணக்கம்", "machi", "thala", "thalaiva", "sari", "enna machi", "nalla irukkingala", "nalama",
            "maapley", "maapleyy", "maaplay", "maaplai", "vanakamdaa", "vanakkamdaa", "vanakamda", "vanakkamda"
        ];
        
        // Only treat terms of address and name calls as greetings if the message is short (<= 3 words)
        const shortOnlyKeywords = ["machan", "machang", "macha", "thala", "thalaiva", "maapley", "maapleyy", "maaplay", "maaplai", "bro", "kappy", "kapri"];
        
        const cleanMessage = message.trim().toLowerCase().replace(/[^a-z0-9\s\u0B80-\u0BFF]/g, '');
        const words = cleanMessage.split(/\s+/).filter(Boolean);
        
        const hasGreeting = words.some((w: string) => {
            return greetingKeywords.some((g: string) => {
                if (shortOnlyKeywords.includes(g) && words.length > 3) {
                    return false;
                }
                if (g.length <= 3) {
                    return w === g;
                } else {
                    return w.startsWith(g) || w.includes(g);
                }
            });
        }) || greetingKeywords.some((g: string) => {
            if (shortOnlyKeywords.includes(g) && words.length > 3) {
                return false;
            }
            return cleanMessage === g || cleanMessage.startsWith(g + " ");
        });

        const isShoppingIntent = ["SHOPPING", "GIFTING", "REORDER", "BROWSING", "PRICE_REFINEMENT", "PREFERENCE_CORRECTION", "EXPLORATION", "PRODUCT_REJECTION", "CHECKOUT_CONFIRM"].includes(understandingPlan.intent || "");
        const shouldForceGreeting = hasGreeting && (!isShoppingIntent || words.length <= 3);

        if (shouldForceGreeting || understandingPlan.intent === "GREETING" || understandingPlan.intent === "SMALL_TALK") {
            understandingPlan.intent = "GREETING";
            understandingPlan.is_shopping_request = false;
            understandingPlan.product_type = "UNKNOWN";
            if (understandingPlan.intelligenceData) {
                understandingPlan.intelligenceData.intent = "GREETING";
                understandingPlan.intelligenceData.readyForRecommendation = false;
            }
        }

        // Force SHOPPING intent for short product queries (e.g., "flower", "toys")
        if (!hasGreeting && words.length > 0 && words.length <= 3 && (!understandingPlan.is_shopping_request || understandingPlan.intent === "UNCLEAR")) {
             understandingPlan.intent = "SHOPPING";
             understandingPlan.is_shopping_request = true;
             understandingPlan.product_type = message;
             
             // Bypass clarification questions for explicit short product searches
             if (understandingPlan.intelligenceData) {
                 understandingPlan.intelligenceData.readyForRecommendation = true;
             } else {
                 understandingPlan.intelligenceData = { readyForRecommendation: true };
             }
        }

        // Force PREFERENCE_CORRECTION intent for explicit exclusions
        const mlMessage = message.toLowerCase();
        if (mlMessage.includes("don't like") || mlMessage.includes("dont like") || mlMessage.includes("remove") || mlMessage.includes("hate") || mlMessage.includes("doesn't like") || mlMessage.includes("doesnt like")) {
             understandingPlan.intent = "PREFERENCE_CORRECTION";
             understandingPlan.is_shopping_request = true;
        }

        // Force PRICE_REFINEMENT intent for explicit price sorting
        if (mlMessage.includes("sort") || mlMessage.includes("low to high") || mlMessage.includes("high to low") || mlMessage.includes("cheaper") || mlMessage.includes("expensive")) {
             understandingPlan.intent = "PRICE_REFINEMENT";
             understandingPlan.is_shopping_request = true;
             
             if (!understandingPlan.intelligenceData) understandingPlan.intelligenceData = {};
             if (!understandingPlan.intelligenceData.price_refinement) {
                 const sortOrder = (mlMessage.includes("low to high") || mlMessage.includes("cheaper") || mlMessage.includes("lowest")) ? "ASC" :
                                   (mlMessage.includes("high to low") || mlMessage.includes("expensive") || mlMessage.includes("highest")) ? "DESC" : null;
                 if (sortOrder) {
                     understandingPlan.intelligenceData.price_refinement = {
                         sort_order: sortOrder,
                         min_target: null,
                         max_target: null
                     };
                 }
             }
        }

        // 2b. CONTEXTUAL HISTORY RETRIEVAL LAYER
        let structuredMemorySummary = "No historical context requested.";
        if (understandingPlan.needs_history) {
            console.log("History explicitly requested by Understanding Engine. Target:", understandingPlan.history_target);
            const pastChats = await getRecentChatHistory(userId, 30);

            if (understandingPlan.history_target === "past_conversation" || understandingPlan.history_target === "current_conversation") {
                const recentHistory = pastChats.slice(0, 10).reverse().map(c => `${c.role === "user" ? "User" : "Kappy"}: ${c.content}`).join("\n");
                // In a production system, we'd run this through a summarizer LLM.
                // For now, we inject the most recent snippet cleanly formatted.
                structuredMemorySummary = `[RECENT CONVERSATION SNIPPET FOR CONTEXT MATCHING]\n${recentHistory}`;
            } else if (understandingPlan.history_target === "recent_purchase") {
                const purchaseSummary = purchases.slice(0, 5).map(p => `- ${p.product_name} (${p.product_category}) on ${p.created_at}`).join("\n");
                structuredMemorySummary = `[RECENT PURCHASE HISTORY]\n${purchaseSummary || "No recent purchases found."}`;
            }
        }

        const { RuleEngine } = await import("@/lib/intelligence/orchestrator/ruleEngine");
        const { ActionRouter } = await import("@/lib/intelligence/orchestrator/actionRouter");
        const { BypassRule, TrackOrderRule, CheckoutRule } = await import("@/lib/intelligence/orchestrator/rules/foundational/basicRules");
        const { ClarificationRule, SearchProductsRule, ShowMoreRule, ExploreCategoriesRule } = await import("@/lib/intelligence/orchestrator/rules/shopping/shoppingRules");

        const engine = new RuleEngine();
        engine.registerRule(new BypassRule());
        engine.registerRule(new TrackOrderRule());
        engine.registerRule(new CheckoutRule());
        engine.registerRule(new ClarificationRule());
        engine.registerRule(new SearchProductsRule());
        engine.registerRule(new ShowMoreRule());
        engine.registerRule(new ExploreCategoriesRule());

        const { JourneyStateMachine } = await import("@/lib/intelligence/state/journeyStateMachine");
        // snapshot is loaded earlier

        // Load session persona or initialize default
        const previousPersona = snapshot?.sessionPersona || {
            primary_language: "English",
            script_type: "roman",
            formality: "casual",
            energy: "medium",
            tone: "friendly",
            mixing_ratio: 0.0,
            detected_slang: []
        };

        // Detect current persona
        const currentDetection = await detectPersonaFromMessage(message);

        let mergedLanguage = currentDetection.primary_language;
        let mergedScript = currentDetection.script_type;

        const localLanguages = ["Singlish", "Tanglish", "Tamil", "Sinhala", "Mixed English + Tamil", "Mixed English + Singlish"];
        if (localLanguages.includes(previousPersona.primary_language) && currentDetection.primary_language === "English") {
            const hasSinhalaUnicode = /[\u0D80-\u0DFF]/.test(message);
            const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(message);
            const singlishScore = (currentDetection as any).singlishScore || 0;
            const tanglishScore = (currentDetection as any).tanglishScore || 0;
            const cleanMessage = message.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
            const wordsCount = cleanMessage.split(/\s+/).filter(Boolean).length;

            const hasZeroLocalWords = (singlishScore === 0 && tanglishScore === 0 && !hasSinhalaUnicode && !hasTamilUnicode);
            const isLongMessage = wordsCount > 5;

            if (isLongMessage && hasZeroLocalWords) {
                // Switch to English!
                mergedLanguage = "English";
                mergedScript = "roman";
                console.log("[Language Lock] User switched to full English. Releasing language lock.");
            } else {
                // Retain local language
                mergedLanguage = previousPersona.primary_language;
                mergedScript = previousPersona.script_type;
                console.log(`[Language Lock] Preserving previous local language: ${mergedLanguage}`);
            }
        }

        // Merge Strategy (Option A): Current wins
        const activePersona: DetectedPersona = {
            ...previousPersona,
            ...currentDetection,
            primary_language: mergedLanguage,
            script_type: mergedScript,
            detected_slang: Array.from(new Set([...(previousPersona.detected_slang || []), ...(currentDetection.detected_slang || [])]))
        };

        // Dirty Profile Updates for registered users (saves DB calls)
        const languageChanged = activePersona.primary_language !== profile.primary_language;
        const formalityChanged = activePersona.formality !== profile.communication_style;

        if (userId !== "00000000-0000-0000-0000-000000000000" && (languageChanged || formalityChanged)) {
            try {
                await updateProfile(userId, {
                    primary_language: activePersona.primary_language,
                    communication_style: activePersona.formality
                });
            } catch (err) {
                console.error("Failed to update user profile in Supabase:", err);
            }
        }
        
        // Phase 2: Merge previous turn variables when continuation is triggered
        const isContinuation = snapshot ? (
            understandingPlan.intent === "PRICE_REFINEMENT" ||
            understandingPlan.intent === "PREFERENCE_CORRECTION" ||
            understandingPlan.intent === "PRODUCT_REJECTION" ||
            (["SHOPPING", "GIFTING", "REORDER", "BROWSING", "EXPLORATION", "PRODUCT_REJECTION"].includes(understandingPlan.intent) &&
             (understandingPlan.intelligenceData?.action === "SHOW_MORE" || 
              understandingPlan.intelligenceData?.action === "RECALL_PREVIOUS_RESULTS" || 
              message.toLowerCase().includes("show more") || 
              message.toLowerCase().includes("cheaper") || 
              message.toLowerCase().includes("next") || 
              message.toLowerCase().includes("compare") || 
              message.toLowerCase().includes("add card") || 
              message.toLowerCase().includes("add item") ||
              message.toLowerCase().includes("filter") ||
              message.toLowerCase().includes("sort")))
        ) : false;

        // V1.0 Demo Stabilization - Query Drift & Context Overwrite Fix
        // If the user's message is short (under 5 words) and there is an active snapshot with a previous search query,
        // treat it as a Context Update answering a clarification question, NOT a new context override search.
        const isContextUpdate = snapshot ? (
            message.split(/\s+/).length <= 5 && 
            (snapshot.searchSession?.query || snapshot.recipient || snapshot.occasion) &&
            (!understandingPlan.intent || ["SHOPPING", "UNKNOWN", "GIFTING", "EXPLORATION"].includes(understandingPlan.intent))
        ) : false;

        if (snapshot && (isContinuation || isContextUpdate)) {
            console.log("[Context Retention] Continuation detected. Merging previous parameters from snapshot:", {
                recipient: snapshot.recipient,
                occasion: snapshot.occasion,
                budget: snapshot.budget,
                query: snapshot.searchSession?.query
            });

            if ((!understandingPlan.product_type || understandingPlan.product_type === "UNKNOWN") && snapshot.searchSession?.query) {
                understandingPlan.product_type = snapshot.searchSession.query;
                understandingPlan.extracted_product_type = { type: snapshot.searchSession.query, confidence: 1.0 };
                if (understandingPlan.intelligenceData) {
                    understandingPlan.intelligenceData.product_type = snapshot.searchSession.query;
                }
            }
            if ((!understandingPlan.extracted_recipient?.type || understandingPlan.extracted_recipient.type === "UNKNOWN" || understandingPlan.extracted_recipient.type === null) && snapshot.recipient) {
                understandingPlan.extracted_recipient = { type: snapshot.recipient, confidence: 1.0 };
                if (understandingPlan.intelligenceData?.situation) {
                    understandingPlan.intelligenceData.situation.recipient = snapshot.recipient;
                }
            }
            if ((!understandingPlan.extracted_occasion?.type || understandingPlan.extracted_occasion.type === "UNKNOWN" || understandingPlan.extracted_occasion.type === null) && snapshot.occasion) {
                understandingPlan.extracted_occasion = { type: snapshot.occasion, confidence: 1.0 };
                if (understandingPlan.intelligenceData?.situation) {
                    understandingPlan.intelligenceData.situation.occasion = snapshot.occasion;
                }
            }
            if (!understandingPlan.budget?.target && snapshot.budget) {
                understandingPlan.budget = { target: Number(snapshot.budget) };
                if (understandingPlan.intelligenceData?.situation?.budget) {
                    understandingPlan.intelligenceData.situation.budget.max = Number(snapshot.budget);
                }
            }
            
            // Keep recommendation ready and bypass missingInfo checks if previous parameters exist
            if (understandingPlan.intelligenceData) {
                understandingPlan.intelligenceData.readyForRecommendation = true;
                if (understandingPlan.intelligenceData.missingInfo) {
                    understandingPlan.intelligenceData.missingInfo.isMissingCriticalInfo = false;
                }
            }
        }

        const stateMachine = new JourneyStateMachine(snapshot ? snapshot.journeyState : "IDLE");

        const ruleContext = {
            understandingPlan,
            journeyState: stateMachine.getCurrentState(),
            sessionSnapshot: snapshot,
            message
        };

        const { winner, trace } = engine.evaluate(ruleContext);
        let plan = ActionRouter.mapDecision(winner, understandingPlan.intent);
        if (understandingPlan.intent === "PRODUCT_REJECTION") {
            plan = {
                route: "recommendation",
                mcp_tool_needed: "kapruka_search_products",
                mcp_search_query: snapshot?.searchSession?.query || "gifts",
                shopping_stage: "SEARCH",
                recommendation_mode: "FAST"
            } as any;
        }
        if (snapshot && !isContinuation && !isContextUpdate) {
            plan.is_context_override = true;
        }

        // ------------------------------------------------------------
        // INTENT + STATE ROUTING GUARDRAIL
        // Prevent "hi" from triggering searches or recommendations.
        // ------------------------------------------------------------
        if (understandingPlan.intent === "GREETING") {
            const state = stateMachine.getCurrentState() as any;
            
            // If it's a greeting, and we aren't in the middle of a checkout
            if (state !== "EXPECTING_SELECTION" && state !== "PROCEED_TO_CHECKOUT") {
                console.log("[Guardrail] Greeting detected in non-checkout state. Bypassing shopping pipeline.");
                plan.route = "bypass";
                plan.mcp_tool_needed = null;
                understandingPlan.is_shopping_request = false;
            }
        }

        console.log("Kappy Deterministic Router Trace:", JSON.stringify(trace, null, 2));

        const ruleTrace = await TraceCollector.logExecution(
            traceId,
            decisionId,
            "RULE", // Valid EngineType
            (trace as any).latencyMs || 0,
            { evaluatedRules: trace.evaluatedRules },
            { selectedRule: trace.selectedRule },
            "HEALTHY"
        );
        sessionTraces.push(ruleTrace);

        // 3. Save memory to database if extracted
        if (understandingPlan.extracted_memory) {
            const ext = understandingPlan.extracted_memory;
            let relId = "";

            if (ext.relationship) {
                let existingRel = relationships.find(
                    r => r.relationship_type?.toLowerCase() === ext.relationship?.toLowerCase()
                );
                if (!existingRel) {
                    existingRel = await addRelationship(userId, {
                        relationship_type: ext.relationship,
                        nickname: ext.relationship === "mother" ? "Amma" : ext.relationship,
                        notes: ext.notes || ""
                    });
                }
                relId = existingRel.id;
            }

            if (ext.category === "preference" && ext.interest) {
                await addPreference(userId, relId || undefined, ext.interest);
                await addMemory(userId, "preference", ext.relationship || "user", `${ext.relationship || 'User'} likes ${ext.interest}`);
            }

            if (ext.category === "behavior" && ext.behavioral_trait) {
                await addMemory(userId, "behavior", "user_trait", ext.behavioral_trait);
            }
        }

        if (understandingPlan.intent === "PREFERENCE_CORRECTION" && understandingPlan.intelligenceData?.preference_corrections) {
            for (const corr of understandingPlan.intelligenceData.preference_corrections) {
                if (corr.recipient && corr.negative && corr.strength === "HARD") {
                    let relId = "";
                    const existingRel = relationships.find(
                        r => r.relationship_type?.toLowerCase() === corr.recipient?.toLowerCase()
                    );
                    if (!existingRel) {
                        const newRel = await addRelationship(userId, {
                            relationship_type: corr.recipient,
                            nickname: corr.recipient,
                            notes: ""
                        });
                        relId = newRel.id;
                    } else {
                        relId = existingRel.id;
                    }
                    await addPreference(userId, relId, `Dislikes: ${corr.target}`);
                    await addMemory(userId, "preference", corr.recipient, `${corr.recipient} dislikes ${corr.target}`);
                }
            }
        }

        // 4. Update Profile Budget if detected
        let previousBudget = profile?.average_budget || null;
        if (understandingPlan.budget && understandingPlan.budget.target) {
            await updateProfile(userId, { average_budget: understandingPlan.budget.target });
        }

        // Handle Context Override Invalidation
        if (plan.is_context_override) {
            // Delete cache if context changed
            await saveSearchSession({
                chat_session_id: activeSessionId,
                user_id: userId,
                query: "INVALIDATED",
                total_products: 0,
                displayed_count: 0,
                remaining_count: 0,
                products: []
            });
        }

        // Determine event based on current plan
        let journeyEvent: any = null;
        if (understandingPlan.intent === "GIFTING") journeyEvent = "START_GIFT_SEARCH";
        else if (understandingPlan.intent === "REORDER") journeyEvent = "START_REORDER";
        else if (understandingPlan.intent === "TRACK_ORDER") journeyEvent = "START_TRACKING";
        else if (understandingPlan.extracted_recipient?.type) journeyEvent = "RECIPIENT_IDENTIFIED";
        else if (understandingPlan.extracted_occasion?.type) journeyEvent = "OCCASION_IDENTIFIED";
        else if (understandingPlan.budget?.target) journeyEvent = "BUDGET_IDENTIFIED";

        if (plan.mcp_tool_needed === "kapruka_search_products") journeyEvent = "RECOMMENDATIONS_FOUND";
        if (plan.is_bundle_requested) journeyEvent = "BUNDLE_CREATED";
        if (plan.detected_intent === "checkout_request") journeyEvent = "PROCEED_TO_CHECKOUT";

        if (journeyEvent) {
            stateMachine.transition(journeyEvent);
        }

        const shouldClearParams = plan.is_context_override === true;

        // Save new state
        let excludeCategories = snapshot?.searchSession?.filters?.excludeCategories || [];
        if (understandingPlan.intent === "PRODUCT_REJECTION" && preIntentResult?.slots?.exclusion_target) {
            const target = preIntentResult.slots.exclusion_target;
            if (!excludeCategories.includes(target)) {
                excludeCategories = [...excludeCategories, target];
            }
        }

        await SessionSnapshotEngine.saveSnapshot(activeSessionId, {
            journeyState: stateMachine.getCurrentState(),
            recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.recipient),
            occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.occasion),
            budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.budget),
            activeBundle: snapshot?.activeBundle || [],
            recommendedProducts: snapshot?.recommendedProducts || [],
            searchSession: {
                query: understandingPlan.product_type || (shouldClearParams ? null : snapshot?.searchSession?.query),
                recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.searchSession?.recipient),
                occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.searchSession?.occasion),
                budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.searchSession?.budget),
                filters: shouldClearParams ? null : {
                    ...(understandingPlan.intelligenceData?.price_refinement || snapshot?.searchSession?.filters || {}),
                    excludeCategories
                },
                shownProducts: snapshot?.searchSession?.shownProducts || []
            },
            bundleSession: {
                items: snapshot?.activeBundle || [],
                total: snapshot?.activeBundle?.reduce((acc: number, item: any) => acc + (item.price || 0), 0) || 0,
                recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.bundleSession?.recipient),
                occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.bundleSession?.occasion),
                budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.bundleSession?.budget)
            },
            sessionPersona: activePersona
        });

        let toolResults: unknown = null;
        let productsList: any[] = [];
        let isAllRequested = false;
        let initialVisibleCount = 6;
        let previousSearchSession: any | null = null;
        let trackingData: any = null;
        let traceReport: any = null;
        let rawProductCount = 0;
        let deduplicatedCount = 0;
        let filteredCount = 0;
        let semanticRemovedCount = 0;
        // Track bundle creation state
        let bundleOptions: unknown[] = [];
        // Track gift message state
        let giftMessageOptions: unknown[] = [];
        let transparencyMessage = "";
        let followUpSuggestions: string[] = [];

        let toolExecutionTrace = {
            tool_called: plan.mcp_tool_needed,
            arguments: plan.mcp_search_query,
            status: "pending",
            error_details: null as string | null
        };

        const nonShoppingIntents = ["GREETING", "SMALL_TALK", "CAPABILITY_QUESTION", "ABOUT_AGENT", "GRATITUDE", "ACKNOWLEDGMENT", "CANCELLATION", "FRUSTRATION", "COMPLAINT", "PARTIAL_CONTEXT", "AMBIGUOUS", "OBSERVATION", "FEEDBACK", "EMPTY_OR_TEST", "ORDER_ISSUE", "TRACK_ORDER", "TRACKING", "DELIVERY", "UNKNOWN"];

        if (plan.route === 'clarification') {
            toolExecutionTrace.status = "clarification";
            toolResults = {
                clarification_needed: true,
                message: understandingPlan.intelligenceData?.nextQuestion || "Could you tell me a bit more about what you're looking for?"
            };
        } else if (!understandingPlan.is_shopping_request && !nonShoppingIntents.includes(understandingPlan.intent)) {
            // DOMAIN GUARDRAIL TRIGGERED
            toolResults = {
                guardrail_triggered: true,
                message: `Sorry! 😊 I'm Kappy, a shopping assistant for Kapruka.\n\nI can help you with:\n• Finding products\n• Gift recommendations\n• Delivery information\n• Orders and tracking\n• Reordering purchases\n\nI can't assist with programming, academic questions, or general knowledge topics.\n\nWhat would you like to shop for today?`
            };
        } else if (plan.is_task_cancelled) {
            toolExecutionTrace.status = "cancelled";
            toolResults = { status: "cancelled", message: "User cancelled the task." };
        } else if (understandingPlan.intent === "COMPLAINT" || understandingPlan.intent === "FRUSTRATION" || plan.detected_intent === "customer_service_escalation") {
            // Immediately hand off without searching
            toolResults = {
                handoff: true,
                message: "This looks like a customer service issue. I am preparing to hand you over to a live Kapruka agent."
            };
        } else if (plan.detected_intent === "checkout_request") {
            // Generate checkout link
            toolResults = {
                checkout: true,
                link: "https://www.kapruka.com/checkout?session=chat-session"
            };

            // Phase 4: Implicit Learning Signal for PURCHASE (Simulated on checkout request for MVP)
            if (understandingPlan.product_type && understandingPlan.product_type !== "UNKNOWN") {
                const { SignalCollector } = await import("@/lib/intelligence/learning/signalCollector");
                SignalCollector.collect({
                    userId: userId,
                    recipient: understandingPlan.recipient?.type || null,
                    entityType: "category",
                    entityId: understandingPlan.product_type,
                    action: "PURCHASE",
                    timestamp: new Date()
                }).catch(e => console.error("Error collecting signal:", e));
            }
        } else if (understandingPlan.intent === "REORDER" || plan.is_reorder || understandingPlan.history_target === "recent_purchase") {
            // REORDER INTENT ROUTING
            const reorderProducts = await searchPurchases(userId, understandingPlan.extracted_product_type?.type || plan.mcp_search_query || "", 8);
            if (reorderProducts.length > 0) {
                productsList = reorderProducts.map(p => {
                    const normalized = ProductAdapter.normalizeProduct(p);
                    return {
                        id: p.product_id || normalized.id,
                        name: p.product_name || normalized.name,
                        category: p.product_category || normalized.category,
                        price: normalized.price,
                        url: `https://www.kapruka.com/buyonline/${p.product_id}`,
                        isReorderCandidate: true
                    };
                });
                ProductAdapter.assertCanonicalProducts(productsList, "Reorder Pipeline");
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: productsList };
            } else {
                toolResults = { status: "failed", error: "Could not find that product in your past orders." };
            }
        } else if (plan.mcp_tool_needed === "show_more" || (plan.mcp_tool_needed === "kapruka_search_products" && plan.mcp_search_query)) {
            const recipientVal = understandingPlan.recipient?.type || "unknown";
            const occasionVal = understandingPlan.occasion?.type || "unknown";
            const mode = plan.recommendation_mode || "recommendation";
            let finalRankedList: any[] = [];
            let cacheRemaining = 0;
            rawProductCount = 0;
            filteredCount = 0;
            semanticRemovedCount = 0;
            deduplicatedCount = 0;
            // Use the outer request-level traceId to link the observability reports
            let logs: any[] = [];
            let rankingResult: any = null;
            let rankingStartTime = 0;

            // Detect Refinement Intent
            let refinementType: "cheaper" | "premium" | "more" | "exclusion" | "price" = "more";
            const ml = message.toLowerCase();
            if (understandingPlan.intent === "PREFERENCE_CORRECTION") {
                refinementType = "exclusion";
                plan.mcp_tool_needed = "show_more"; // Force cache fetch
            } else if (understandingPlan.intent === "PRICE_REFINEMENT") {
                refinementType = "price";
                plan.mcp_tool_needed = "show_more"; // Force cache fetch
            } else if (ml.includes("cheap") || ml.includes("affordable") || ml.includes("less") || ml.includes("budget")) {
                refinementType = "cheaper";
            } else if (ml.includes("premium") || ml.includes("expensive") || ml.includes("luxury") || ml.includes("best")) {
                refinementType = "premium";
            }

            let sessionObj: any = null;
            let poolExhausted = false;
            let refinementHistory: string[] = [];
            let activeExclusions: { target: string; strength: string }[] = [];

            if (plan.mcp_tool_needed === "kapruka_search_products") {
                if (!plan.is_context_override) {
                    const session = await getSearchSession(activeSessionId, userId);
                    if (session) {
                        activeExclusions = session.active_exclusions || [];
                    }
                }
                if (understandingPlan.intent === "PRODUCT_REJECTION" && preIntentResult?.slots?.exclusion_target) {
                    const target = preIntentResult.slots.exclusion_target;
                    if (!activeExclusions.some(e => e.target === target)) {
                        activeExclusions.push({ target, strength: "HARD" });
                    }
                }
            }

            let activePriceRefinement: any = null;
            let viewedPages = 0;
            let displayedIdsSet = new Set<string>();
            let wasCacheExpired = false;

            if (plan.mcp_tool_needed === "show_more" || refinementType !== "more") {
                // FETCH FROM CACHE
                const session = await getSearchSession(activeSessionId, userId);
                previousSearchSession = session;
                if (session) {
                    const sessionAgeMinutes = (Date.now() - new Date(session.created_at || (session as any).updated_at || Date.now()).getTime()) / (1000 * 60);
                    if (sessionAgeMinutes > 15) {
                        plan.mcp_tool_needed = "kapruka_search_products"; // force re-fetch due to TTL
                        wasCacheExpired = true;
                    } else if (session.products && session.products.length > 0) {
                        sessionObj = session;
                        // Migration Guard: normalize products from legacy cache
                        finalRankedList = session.products.map((p: any) => ProductAdapter.normalizeProduct(p));
                        ProductAdapter.assertCanonicalProducts(finalRankedList, "Cache Pipeline");
                        rawProductCount = session.total_products;
                        refinementHistory = session.refinement_history || [];
                        activeExclusions = session.active_exclusions || [];
                        activePriceRefinement = session.active_price_refinement || null;

                        // Kappy V2: Smarter Cache Recall
                        const cacheAction = plan.detected_intent;
                        if (cacheAction === "RECALL_PREVIOUS_RESULTS") {
                            // Do not increment viewedPages, just reload what we had
                            viewedPages = session.viewed_pages || 1;
                        } else {
                            // SHOW_MORE action or default refinement
                            viewedPages = (session.viewed_pages || 1) + 1;
                        }

                        displayedIdsSet = new Set(session.displayed_ids || []);

                        if (refinementType !== "more" && refinementType !== "exclusion" && refinementType !== "price" && !refinementHistory.includes(refinementType)) {
                            refinementHistory.push(refinementType);
                        }
                    } else {
                        plan.mcp_tool_needed = "kapruka_search_products";
                    }
                } else {
                    const isMissingContext = !understandingPlan.intelligenceData?.readyForRecommendation && (!understandingPlan.product_type || understandingPlan.product_type === "UNKNOWN");
                    if ((understandingPlan.intent === "PREFERENCE_CORRECTION" || understandingPlan.intent === "PRICE_REFINEMENT") && isMissingContext) {
                        plan.mcp_tool_needed = null;
                        toolResults = {
                            clarification_needed: true,
                            message: understandingPlan.intent === "PRICE_REFINEMENT" 
                                ? "I can certainly sort products for you! However, you haven't mentioned what you'd like to search for. What type of product should I look up?"
                                : "Got it! I've noted that down. What kind of gift were you thinking of looking for instead?"
                        };
                    } else {
                        plan.mcp_tool_needed = "kapruka_search_products";
                        if (!plan.mcp_search_query) {
                            const components = [];
                            if (understandingPlan.product_type && understandingPlan.product_type !== "UNKNOWN") components.push(understandingPlan.product_type);
                            if (understandingPlan.situation?.recipient && understandingPlan.situation.recipient !== "UNKNOWN") components.push(understandingPlan.situation.recipient);
                            if (understandingPlan.situation?.occasion && understandingPlan.situation.occasion !== "UNKNOWN") components.push(understandingPlan.situation.occasion);
                            
                            plan.mcp_search_query = components.length > 0 ? components.join(" ") : message;
                        }
                    }
                }
            }

            if (plan.mcp_tool_needed === "kapruka_search_products") {
                const { GodTelemetryService } = await import("@/lib/intelligence/observability/godmode/telemetryService");
                const { ProductAuditService } = await import("@/lib/intelligence/observability/godmode/productAuditService");
                const { ReplayService } = await import("@/lib/intelligence/observability/godmode/replayService");

                GodTelemetryService.emit("Retrieval Engine", "RUNNING", { query: plan.mcp_search_query });

                const translatedQuery = await translateSearchQuery(plan.mcp_search_query || "");
                
                console.log("\n================ [QUERY TRANSLATION PIPELINE] ================");
                console.log(`1. Raw Input:      "${message}"`);
                console.log(`2. LLM Extraction: "${plan.mcp_search_query || ""}"`);
                console.log(`3. Final MCP Query: "${translatedQuery}"`);
                console.log("==============================================================\n");

                let rawProducts = await mcpSearchProducts(translatedQuery, 50);
                
                // Fallback items if MCP is offline / empty
                if (!rawProducts || rawProducts.length === 0) {
                    console.warn("[Offline Fallback] mcpSearchProducts returned 0 items. Seeding mock catalog fallbacks.");
                    rawProducts = [
                        {
                            id: "cake00KA002034",
                            name: "Blueberry Bliss Bento Cheesecake",
                            summary: "Indulge in this delicious Blueberry Cheesecake, hand-decorated for celebrations.",
                            price: { amount: 4200, currency: "LKR" },
                            in_stock: true,
                            stock_level: "low",
                            image_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80",
                            category: { id: "cat_cakes", name: "cakes" },
                            rating: 4.8,
                            url: "https://www.kapruka.com/buyonline/blueberry-bliss-bento-cheeseca/kid/cake00ka002034"
                        },
                        {
                            id: "flow00KA001235",
                            name: "Fresh Red Roses Bouquet",
                            summary: "A premium arrangement of 12 fresh red roses to express your deep affection.",
                            price: { amount: 2500, currency: "LKR" },
                            in_stock: true,
                            stock_level: "medium",
                            image_url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400&q=80",
                            category: { id: "cat_flowers", name: "flowers" },
                            rating: 4.9,
                            url: "https://www.kapruka.com/buyonline/fresh-red-roses-bunch"
                        },
                        {
                            id: "choc00KA005432",
                            name: "Ferrero Rocher Box (16 Pcs)",
                            summary: "Classic golden hazelnut chocolates, a luxurious treat for any gifting occasion.",
                            price: { amount: 1800, currency: "LKR" },
                            in_stock: true,
                            stock_level: "medium",
                            image_url: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80",
                            category: { id: "cat_chocolates", name: "chocolates" },
                            rating: 4.7,
                            url: "https://www.kapruka.com/online/chocolates"
                        }
                    ] as any;
                }

                rawProductCount = rawProducts.length;
                GodTelemetryService.emit("Retrieval Engine", "COMPLETED", { query: plan.mcp_search_query, count: rawProductCount });
                ReplayService.recordStep("Product Retrieval", { 
                    query: plan.mcp_search_query,
                    location: plan.delivery_city || understandingPlan.intelligenceData?.situation?.location || "Colombo",
                    budget: understandingPlan.budget?.target,
                    occasion: understandingPlan.occasion?.type,
                    recipient: understandingPlan.recipient?.type
                }, { count: rawProductCount, products: rawProducts });

                // Map to standardized format using ProductAdapter
                const mappedProducts: CanonicalProductV1[] = rawProducts.map(p => ProductAdapter.adaptMCPProduct(p));
                ProductAdapter.assertCanonicalProducts(mappedProducts, "MCP Retrieval");

                mappedProducts.forEach((p: any) => {
                    ProductAuditService.transition(
                        p.id,
                        p.name,
                        "RETRIEVED",
                        "APPROVED",
                        "Retrieved from Kapruka catalog search",
                        p.url
                    );
                });

                // 1. Deduplication First
                const dedupedProducts = deduplicateProducts(mappedProducts, "Kapruka Search Recommendations");
                deduplicatedCount = rawProducts.length - dedupedProducts.length;

                const dedupedCandidateIds = new Set(dedupedProducts.map(p => p.id));
                mappedProducts.forEach((p: any) => {
                    if (!dedupedCandidateIds.has(p.id)) {
                        ProductAuditService.transition(
                            p.id,
                            p.name,
                            "DEDUPLICATED",
                            "REJECTED",
                            "Duplicate item filtered from results"
                        );
                    } else {
                        ProductAuditService.transition(
                            p.id,
                            p.name,
                            "DEDUPLICATED",
                            "APPROVED",
                            "Unique candidate product retained"
                        );
                    }
                });

                // 2. Strict Filter Engine
                const validationResult = validateProducts(
                    dedupedProducts as any[],
                    {
                        userIntent: plan.shopping_stage || plan.mcp_search_query || "",
                        currentShoppingStage: plan.shopping_stage || "",
                        occasion: understandingPlan.occasion?.type || undefined,
                        recipient: understandingPlan.recipient?.type || undefined,
                        budget: understandingPlan.budget?.target || undefined,
                        budgetNormalized: understandingPlan.budget || undefined,
                        searchQuery: plan.mcp_search_query || "",
                        mappedCategory: understandingPlan.mapped_category || "UNKNOWN",
                        originalMessage: message
                    },
                    logs
                );

                filteredCount = validationResult.rejected.length;
                logs = validationResult.logs;

                validationResult.rejected.forEach((p: any) => {
                    const item = p;
                    const log = validationResult.logs.find((l: any) => l.productId === p.id);
                    const reasons = log?.reason || "Failed hard constraints";
                    ProductAuditService.transition(
                        item.id,
                        item.name,
                        "HARD_FILTER",
                        "REJECTED",
                        reasons
                    );
                });
                validationResult.approved.forEach((item: any) => {
                    ProductAuditService.transition(
                        item.id,
                        item.name,
                        "HARD_FILTER",
                        "APPROVED",
                        "Meets budget, occasion, and recipient requirements"
                    );
                });

                // Phase 4: Call mcpCheckDelivery before ranking when a target city is supplied
                const targetCity = understandingPlan.intelligenceData?.situation?.location || plan.delivery_city;
                let deliveryFilteredApproved = validationResult.approved;
                if (targetCity && targetCity !== "UNKNOWN") {
                    console.log(`[Delivery Intelligence] Target city detected: ${targetCity}. Checking delivery eligibility...`);
                    const checkDeliveryPromises = validationResult.approved.map(async (p: any) => {
                        try {
                            const check = await mcpCheckDelivery(targetCity, null, p.id || p.product_id);
                            return {
                                productId: p.id || p.product_id,
                                available: check ? check.available === true : true
                            };
                        } catch (err) {
                            console.error(`mcpCheckDelivery failed for ${p.id}:`, err);
                            return { productId: p.id || p.product_id, available: true };
                        }
                    });
                    const checks = await Promise.all(checkDeliveryPromises);
                    const availableIds = new Set(checks.filter(c => c.available).map(c => c.productId));
                    
                    // Add logs for rejected items
                    validationResult.approved.forEach((p: any) => {
                        const pid = p.id || p.product_id;
                        if (!availableIds.has(pid)) {
                            logs.push({
                                id: pid,
                                name: p.name,
                                status: "rejected",
                                reasons: [`Not deliverable to ${targetCity}`]
                            });
                        }
                    });

                    validationResult.approved.forEach((p: any) => {
                        const pid = p.id || p.product_id;
                        const deliverable = availableIds.has(pid);
                        ProductAuditService.transition(
                            pid,
                            p.name,
                            "DELIVERY_FILTER",
                            deliverable ? "APPROVED" : "REJECTED",
                            deliverable ? `Deliverable to ${targetCity}` : `Not deliverable to ${targetCity}`
                        );
                    });

                    deliveryFilteredApproved = validationResult.approved.filter((p: any) => 
                        availableIds.has(p.id || p.product_id)
                    );
                    filteredCount += (validationResult.approved.length - deliveryFilteredApproved.length);
                } else {
                    validationResult.approved.forEach((p: any) => {
                        ProductAuditService.transition(
                            p.id || p.product_id,
                            p.name,
                            "DELIVERY_FILTER",
                            "APPROVED",
                            "No delivery constraints specified"
                        );
                    });
                }

                ReplayService.recordStep("Filter Verification", 
                    { inputCount: dedupedProducts.length, targetCity }, 
                    { 
                        approved: deliveryFilteredApproved.map((p: any) => ({ id: p.id, name: p.name })), 
                        rejected: [
                            ...validationResult.rejected.map((p: any) => {
                                const log = validationResult.logs.find((l: any) => l.productId === p.id);
                                return { id: p.id, name: p.name, stage: "HARD_FILTER", reasons: [log?.reason || "Failed hard constraints"] };
                            }),
                            ...validationResult.approved.filter((p: any) => deliveryFilteredApproved.every((d: any) => d.id !== p.id)).map((p: any) => ({ id: p.id, name: p.name, stage: "DELIVERY_FILTER", reasons: [`Not deliverable to ${targetCity}`] }))
                        ]
                    }
                );

                // 3. Scoring Engine
                const dedupedIds = new Set(deliveryFilteredApproved.map((p: any) => p.id));
                const approvedMcpProducts: any[] = [];
                const seenIdsForScoring = new Set<string>();
                for (const p of mappedProducts) {
                    if (dedupedIds.has(p.id) && !seenIdsForScoring.has(p.id)) {
                        approvedMcpProducts.push(p);
                        seenIdsForScoring.add(p.id);
                    }
                }
                let recipientPrefs: string[] = [];
                if (understandingPlan.recipient?.type) {
                    const targetRel = relationships.find(
                        (r: any) => r.relationship_type?.toLowerCase() === understandingPlan.recipient?.type?.toLowerCase()
                    );
                    if (targetRel) {
                        const dbPrefs = preferences.filter((p: any) => p.relationship_id === targetRel.id);
                        recipientPrefs = dbPrefs.map((p: any) => p.interest);
                    }
                }

                const purchaseCategories = purchases.map((p: any) => p.product_category);

                const scoringContext = {
                    situation: understandingPlan.occasion?.type || "unknown",
                    recipient: understandingPlan.recipient?.type || "unknown",
                    recipientPreferences: recipientPrefs,
                    targetBudget: understandingPlan.budget?.target || 0,
                    userIntent: plan.shopping_stage || plan.mcp_search_query || "",
                    purchaseCategories
                };

                // Phase 3: New Recommendation Affinity & Ranking Pipeline
                const { AffinityEngine } = await import("@/lib/intelligence/recommendation/affinityEngine");
                const { RankingEngine } = await import("@/lib/intelligence/recommendation/rankingEngine");
                const { getV15CommunityScores, getTrendScores } = await import("@/lib/intelligence/feedback/feedbackService");
                const { CommunityFeedbackEngine } = await import("@/lib/intelligence/feedback/communityFeedbackEngine");
                
                // Fetch Query Intelligence
                const qb = await createClient();
                const normalizedQ = (plan.mcp_search_query || "").toLowerCase().trim();
                const { data: queryIntelligenceData } = await qb
                    .from("query_intelligence")
                    .select("entity, score")
                    .eq("normalized_query", normalizedQ);

                const userAffinities = await AffinityEngine.getAffinities(userId);

                // Refers to outer scope recipientVal and occasionVal
                const categoryVal = understandingPlan.mapped_category || "UNKNOWN";
                const strategyVal = "general";

                const contextKey = CommunityFeedbackEngine.generateContextKey(
                    recipientVal,
                    occasionVal,
                    categoryVal,
                    strategyVal
                );

                const productIds = approvedMcpProducts.map(p => p.id || p.product_id);
                const communityScores = await getV15CommunityScores(productIds, contextKey, recipientVal, occasionVal);
                const trendScores = await getTrendScores(productIds);

                // Find matching relationship for current recipient to avoid cross-relationship dislikes filter
                const currentRecipientType = (understandingPlan.recipient?.type || "unknown").toLowerCase();
                const activeRelationship = rawRelationships.find(
                    (r: any) => r.relationship_type?.toLowerCase() === currentRecipientType
                );

                // Filter preferences and memories based on active recipient
                const filteredPrefsAndMemories = [
                    ...relevanceResult.relevantMemories.filter((m: any) => {
                        // If it's a relationship memory, check if it matches the current recipient
                        const keyLower = (m.key || "").toLowerCase();
                        const isRelMemory = rawRelationships.some((r: any) => r.relationship_type?.toLowerCase() === keyLower);
                        if (isRelMemory) {
                            return keyLower === currentRecipientType;
                        }
                        return true; // Keep global user memories
                    }),
                    ...rawPreferences.filter((p: any) => {
                        // Keep if it belongs to the active relationship, or is a global user preference (no relationship_id)
                        if (p.relationship_id) {
                            return activeRelationship && p.relationship_id === activeRelationship.id;
                        }
                        return true;
                    })
                ];

                // Extract negative preference tags for hard product rejection
                const negativeMemoryTags = filteredPrefsAndMemories
                    .filter((m: any) => {
                        const val = "interest" in m ? (m.interest || "") : (m.value || "");
                        return val.toLowerCase().startsWith("dislikes:");
                    })
                    .map((m: any) => {
                        const val = "interest" in m ? (m.interest || "") : (m.value || "");
                        return val.replace(/^dislikes:\s*/i, "").trim();
                    });

                const rankingContext = {
                    searchQuery: plan.mcp_search_query || "",
                    situation: occasionVal,
                    recipient: recipientVal,
                    targetBudget: understandingPlan.budget?.target || 0,
                    userAffinities,
                    communityScores,
                    trendScores,
                    queryIntelligence: queryIntelligenceData || [],
                    memoryTags: activeContextTags,
                    negativeMemoryTags,
                    isBudgetExplicit: !!understandingPlan.budget?.target
                };


                rankingStartTime = Date.now();
                GodTelemetryService.emit("Ranking Engine", "RUNNING", { candidatesCount: approvedMcpProducts.length });
                const rankedCandidates = RankingEngine.rankProducts(approvedMcpProducts, rankingContext);
                GodTelemetryService.emit("Ranking Engine", "COMPLETED", { outputCount: rankedCandidates.length });

                rankedCandidates.forEach((c: any) => {
                    ProductAuditService.transition(
                        c.productId,
                        c.productData.name,
                        "RANKED",
                        "APPROVED",
                        `Ranked with score: ${(c.finalScore * 100).toFixed(1)}% (Budget: ${(c.budgetScore * 100).toFixed(0)}%, Affinity: ${(c.affinityScore * 100).toFixed(0)}%, Recipient: ${(c.recipientScore * 100).toFixed(0)}%)`
                    );
                });

                ReplayService.recordStep("Relevance Ranking", 
                    { candidatesCount: approvedMcpProducts.length, context: rankingContext }, 
                    { ranked: rankedCandidates.map(c => ({ id: c.productId, name: c.productData.name, score: c.finalScore })) }
                );

                // --- STAGE 3: SEMANTIC GARBAGE FILTER ---
                const { runSemanticIrrelevanceFilter } = await import("@/lib/intelligence/recommendation/semanticFilter");
                let irrelevantIds: string[] = [];
                let semanticMetrics: any = null;
                if (godModeFilters?.disableSemantic) {
                    console.log("[God Mode] Semantic Filter bypassed by toggle.");
                    GodTelemetryService.emit("Semantic Filter", "COMPLETED", { count: rankedCandidates.length });
                } else {
                    GodTelemetryService.emit("Semantic Filter", "RUNNING", { count: rankedCandidates.length });
                    
                    let specificityScore = 0;
                    if (understandingPlan.product_type && understandingPlan.product_type !== "UNKNOWN") specificityScore += 0.5;
                    if (understandingPlan.situation?.occasion && understandingPlan.situation.occasion !== "UNKNOWN") specificityScore += 0.3;
                    if (understandingPlan.situation?.recipient && understandingPlan.situation.recipient !== "UNKNOWN") specificityScore += 0.2;
                    
                    const searchMode = understandingPlan.searchMode || "PRECISE";

                    const filterResult = await runSemanticIrrelevanceFilter(
                        plan.shopping_stage || plan.mcp_search_query || "",
                        understandingPlan.mapped_category || "UNKNOWN",
                        rankedCandidates.map(c => ({ id: c.productId, name: c.productData.name, category: c.productData.category })),
                        searchMode,
                        specificityScore
                    );
                    irrelevantIds = filterResult.irrelevantIds;
                    semanticMetrics = filterResult.metrics;
                    console.log("[Semantic Recall Metrics]", semanticMetrics);
                    GodTelemetryService.emit("Semantic Filter", "COMPLETED", { irrelevantCount: irrelevantIds.length, metrics: semanticMetrics });
                }

                rankedCandidates.forEach((c: any) => {
                    const isIrrelevant = irrelevantIds.includes(c.productId);
                    ProductAuditService.transition(
                        c.productId,
                        c.productData.name,
                        "SEMANTIC_FILTER",
                        isIrrelevant ? "REJECTED" : "APPROVED",
                        isIrrelevant ? "Filtered by LLM as semantically irrelevant to request" : (godModeFilters?.disableSemantic ? "Bypassed via God Mode" : "Validated as semantically relevant")
                    );
                });

                const finalSemanticRanked = rankedCandidates.filter(c => !irrelevantIds.includes(c.productId));
                semanticRemovedCount = rankedCandidates.length - finalSemanticRanked.length;

                ReplayService.recordStep("Semantic Guardrail", 
                    { inputCount: rankedCandidates.length, irrelevantIds, metrics: semanticMetrics }, 
                    { finalCount: finalSemanticRanked.length, finalProducts: finalSemanticRanked.map(c => ({ id: c.productId, name: c.productData.name, score: c.finalScore })) }
                );
                // ----------------------------------------
                
                const rankingTrace = await TraceCollector.logExecution(
                    traceId,
                    decisionId,
                    "RANKING",
                    Date.now() - rankingStartTime,
                    { context: rankingContext, inputCount: approvedMcpProducts.length },
                    { 
                        rankedCount: finalSemanticRanked.length,
                        semanticRemovedCount,
                        topScore: finalSemanticRanked[0]?.finalScore || 0,
                        topProducts: finalSemanticRanked.slice(0, 3).map(c => ({ id: c.productId, score: c.finalScore }))
                    },
                    "HEALTHY"
                );
                sessionTraces.push(rankingTrace);

                // Map back to expected legacy format for downstream logic
                rankingResult = {
                    ranked: finalSemanticRanked.map((c, index) => {
                        const p = c.productData;
                        p.score = c.finalScore; // Inject score
                        
                        // Generate friendly explanation bullet points
                        const explanations: string[] = [];
                        if (c.budgetScore >= 0.8 && rankingContext.targetBudget) {
                            explanations.push(`Fits LKR ${rankingContext.targetBudget} budget`);
                        } else if (c.budgetScore >= 0.5 && rankingContext.targetBudget) {
                            explanations.push("Budget friendly option");
                        }
                        if (c.recipientScore >= 0.7 && rankingContext.recipient && rankingContext.recipient !== "unknown") {
                            explanations.push(`Great gift for ${rankingContext.recipient}`);
                        }
                        if (c.situationScore >= 0.7 && rankingContext.situation && rankingContext.situation !== "unknown") {
                            explanations.push(`Perfect for ${rankingContext.situation}`);
                        }
                        if (c.memoryBoostScore > 0) {
                            explanations.push("Matches memory profile preferences");
                        } else if (c.affinityScore >= 0.6) {
                            explanations.push("Aligned with historical interest");
                        }
                        if (c.communityScore !== undefined && c.communityScore >= 0.7) {
                            explanations.push("Highly rated by other shoppers");
                        }
                        if (c.trendScore !== undefined && c.trendScore >= 0.7) {
                            explanations.push("Trending gift choice");
                        }
                        if (explanations.length === 0) {
                            explanations.push("Recommended for this occasion");
                        }
                        
                        p.explanations = explanations;
                        p.isKappysPick = (index === 0); // Top ranked item is Kappy's Pick
                        
                        return p;
                    }),
                    logs: finalSemanticRanked.map(c => ({
                        id: c.productId,
                        name: c.productData.name,
                        status: "approved",
                        score: c.finalScore,
                        reasons: [
                            `Situation: ${(c.situationScore * 0.3).toFixed(2)}`,
                            `Affinity: ${(c.affinityScore * 0.4).toFixed(2)}`,
                            `Memory: ${(c.memoryBoostScore * 0.3).toFixed(2)}`
                        ]
                    }))
                };
                // Removed Stage 10 Budget Relaxation as per User Rule:
                // NEVER relax Hard Constraints (Budget max, Adult filter, CommonSenseValidator).
                if (rankingResult.ranked.length === 0) {
                    console.log("Stage 10: Validation resulted in 0 items. Hard constraints are strictly enforced. Budget will NOT be relaxed.");
                }

                // --- KAPPY INTELLIGENCE ENGINE V1: COMMON SENSE VALIDATOR ---
                const { CommonSenseValidator } = await import("@/lib/intelligence/validation/commonSenseValidator");
                const commonSenseResult = CommonSenseValidator.evaluate(rankingResult.ranked as any, understandingPlan.intelligenceData || understandingPlan);

                rankingResult.ranked = commonSenseResult.approved;

                // Add the rejected reasons to the logs for observability
                commonSenseResult.rejected.forEach(rej => {
                    const log = rankingResult.logs.find((l: any) => l.productId === rej.product.id);
                    if (log) {
                        log.status = "rejected";
                        log.reasons = log.reasons || [];
                        log.reasons.push(rej.reason);
                    }
                });
                // ------------------------------------------------------------

                logs = rankingResult.logs;
                finalRankedList = rankingResult.ranked;
            }
            // --- KAPPY INTELLIGENCE ENGINE V1: COMMUNITY FEEDBACK ENGINE ---
            if (!sessionObj) {
                const { getCommunityScores } = await import("@/lib/intelligence/feedback/feedbackService");
                const { CommunityFeedbackEngine } = await import("@/lib/intelligence/feedback/communityFeedbackEngine");

                const contextKey = CommunityFeedbackEngine.generateContextKey(
                    understandingPlan.intelligenceData?.situation?.recipient || "unknown",
                    understandingPlan.intelligenceData?.situation?.occasion || "unknown",
                    understandingPlan.intelligenceData?.product_type || "unknown",
                    understandingPlan.intelligenceData?.plan?.strategy || "unknown"
                );

                const communityScores = await getCommunityScores(finalRankedList.map((r: any) => r.id), contextKey);
                let communityPenaltiesApplied = 0;

                finalRankedList.forEach((prod: any) => {
                    const stats = communityScores[prod.id];
                    const { modifier, reason } = CommunityFeedbackEngine.evaluateModifier(stats);
                    if (modifier !== 0) {
                        prod.score += modifier;
                        const log = logs.find(l => l.productId === prod.id);
                        if (log) {
                            log.reasons = log.reasons || [];
                            log.reasons.push(`Community Feedback: ${reason} (Score ${modifier > 0 ? '+' : ''}${modifier})`);
                            (log as any).communityStats = stats;
                        }
                        if (modifier < 0) communityPenaltiesApplied++;
                    }
                });
                finalRankedList.sort((a: any, b: any) => b.score - a.score);
                (global as any).__tempCommunityPenaltiesApplied = communityPenaltiesApplied;
            }
            const communityPenaltiesApplied = (global as any).__tempCommunityPenaltiesApplied || 0;
            // -----------------------------------------------------------------

            // Process Preference Corrections / Exclusions
            let newlyRemovedCount = 0;

            // Manual fallback if Gemini failed to extract preference_corrections for an explicit correction
            if (understandingPlan.intent === "PREFERENCE_CORRECTION" && (!understandingPlan.intelligenceData?.preference_corrections || understandingPlan.intelligenceData.preference_corrections.length === 0)) {
                if (!understandingPlan.intelligenceData) understandingPlan.intelligenceData = {};
                understandingPlan.intelligenceData.preference_corrections = [];
                const items = ["mug", "cake", "flower", "toy", "chocolate", "bear"]; // Common items fallback
                for (const item of items) {
                    if (ml.includes(item) || ml.includes(item + "s")) {
                        understandingPlan.intelligenceData.preference_corrections.push({
                            target: item,
                            negative: true,
                            strength: "HARD"
                        });
                    }
                }
            }

            if (understandingPlan.intent === "PREFERENCE_CORRECTION" && understandingPlan.intelligenceData?.preference_corrections) {
                const { SignalCollector } = await import("@/lib/intelligence/learning/signalCollector");

                for (const corr of understandingPlan.intelligenceData.preference_corrections) {
                    if (corr.negative) {
                        activeExclusions.push({ target: corr.target, strength: corr.strength });

                        // Phase 4: Implicit Learning Signal for EXPLICIT_DISLIKE
                        SignalCollector.collect({
                            userId: userId,
                            recipient: understandingPlan.recipient?.type || null,
                            entityType: "tag", // Default to tag for corrections
                            entityId: corr.target,
                            action: "EXPLICIT_DISLIKE",
                            timestamp: new Date()
                        }).catch(e => console.error("Error collecting signal:", e));
                    }
                }
            }

            // Filter activeExclusions against finalRankedList
            if (activeExclusions.length > 0) {
                const preExclusionCount = finalRankedList.length;
                finalRankedList = finalRankedList.filter((p: any) => {
                    const searchStr = `${p.name} ${p.category} ${p.description || ""}`.toLowerCase();
                    let shouldRemove = false;
                    for (const excl of activeExclusions) {
                        const aliases = getCategoryAliases(excl.target);
                        const match = aliases.some(alias => searchStr.includes(alias));
                        if (match) {
                            if (excl.strength === "HARD") {
                                shouldRemove = true;
                            } else {
                                p.score -= 20; // Soft penalty
                            }
                        }
                    }
                    return !shouldRemove;
                });
                newlyRemovedCount = preExclusionCount - finalRankedList.length;
            }

            // Global Hard Price Ceiling
            finalRankedList = finalRankedList.filter((p: any) => parseFloat(p.price) <= 200000);

            // Process Price Refinements
            let priceFilteredCount = 0;
            let targetPriceFallbackOptions: any[] = [];

            if (understandingPlan.intent === "PRICE_REFINEMENT" && understandingPlan.intelligenceData?.price_refinement) {
                activePriceRefinement = understandingPlan.intelligenceData.price_refinement;
            }

            if (activePriceRefinement) {
                let min = activePriceRefinement.min_price || 0;
                let max = activePriceRefinement.max_price || Infinity;

                if (activePriceRefinement.target_price && !activePriceRefinement.min_price && !activePriceRefinement.max_price) {
                    min = activePriceRefinement.target_price * 0.7;
                    max = activePriceRefinement.target_price * 1.3;
                }

                if (activePriceRefinement.price_band) {
                    switch (activePriceRefinement.price_band) {
                        case "BUDGET": max = 3000; break;
                        case "MID": min = 3000; max = 10000; break;
                        case "PREMIUM": min = 10000; max = 50000; break;
                        case "LUXURY": min = 50000; break;
                    }
                }

                const preFilterList = [...finalRankedList];
                finalRankedList = finalRankedList.filter((p: any) => {
                    const price = parseFloat(p.price) || 0;
                    return price >= min && price <= max;
                });
                priceFilteredCount = preFilterList.length - finalRankedList.length;

                // Smart Empty Pool Recovery
                if (finalRankedList.length === 0 && preFilterList.length > 0) {
                    const reference = activePriceRefinement.target_price || activePriceRefinement.max_price || activePriceRefinement.min_price || 0;
                    preFilterList.sort((a, b) => Math.abs(parseFloat(a.price) - reference) - Math.abs(parseFloat(b.price) - reference));
                    targetPriceFallbackOptions = preFilterList.slice(0, 3);
                }

                // Handle Explicit Sort Order
                if (activePriceRefinement.sort_order) {
                    if (activePriceRefinement.sort_order === "ASC") {
                        refinementType = "asc" as any;
                    } else if (activePriceRefinement.sort_order === "DESC") {
                        refinementType = "desc" as any;
                    } else if (activePriceRefinement.sort_order === "CHEAPER") {
                        refinementType = "cheaper";
                    } else if (activePriceRefinement.sort_order === "PREMIUM") {
                        refinementType = "premium";
                    }
                }
            }

            // Re-sort based on Refinements
            if (refinementType === "cheaper" || refinementType === "premium") {
                const prices = finalRankedList.map((p: any) => parseFloat(p.price) || 0).sort((a: number, b: number) => a - b);
                let normalizationPrice = prices.length > 0 ? prices[Math.floor(prices.length * 0.9)] : 0;
                if (normalizationPrice === 0) normalizationPrice = 1; // avoid divide by zero

                if (refinementType === "cheaper") {
                    finalRankedList.sort((a: any, b: any) => {
                        const aPrice = parseFloat(a.price) || 0;
                        const bPrice = parseFloat(b.price) || 0;
                        const aPriceScore = Math.max(0, 1 - (aPrice / normalizationPrice));
                        const bPriceScore = Math.max(0, 1 - (bPrice / normalizationPrice));
                        const aFinal = (0.7 * (a.score || 0)) + (0.3 * aPriceScore * 100);
                        const bFinal = (0.7 * (b.score || 0)) + (0.3 * bPriceScore * 100);
                        return bFinal - aFinal;
                    });
                } else {
                    finalRankedList.sort((a: any, b: any) => {
                        const aPrice = parseFloat(a.price) || 0;
                        const bPrice = parseFloat(b.price) || 0;
                        const aPriceScore = Math.min(1, aPrice / normalizationPrice);
                        const bPriceScore = Math.min(1, bPrice / normalizationPrice);
                        const aFinal = (0.7 * (a.score || 0)) + (0.3 * aPriceScore * 100);
                        const bFinal = (0.7 * (b.score || 0)) + (0.3 * bPriceScore * 100);
                        return bFinal - aFinal;
                    });
                }
            } else if (refinementType === "asc" as any) {
                finalRankedList.sort((a: any, b: any) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
            } else if (refinementType === "desc" as any) {
                finalRankedList.sort((a: any, b: any) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
            }

            // -----------------------------------------------------------------
            // RECOMMENDATION FALLBACK SAFETY NET
            // If strict filters (exclusions/prices) wiped out all products,
            // fallback to the highest-scoring validated products to prevent total collapse.
            // -----------------------------------------------------------------
            if (rawProductCount > 0 && finalRankedList.length === 0 && rankingResult?.ranked?.length > 0) {
                console.log("[Guardrail] All products filtered out. Triggering fallback to top validated products.");
                finalRankedList = rankingResult.ranked.slice(0, 3);
            }

            // Slice the top results based on MVC Mode and Diversity
            const mvcMode = understandingPlan.intelligenceData?.recommendation_mode || "FAST";
            const interactionMode = understandingPlan.intelligenceData?.interaction_mode || "RECOMMENDATION";
            const lowerMessage = message.toLowerCase();
            isAllRequested = lowerMessage.includes("all") || 
                             lowerMessage.includes("every") || 
                             lowerMessage.includes("expand") ||
                             lowerMessage.includes("everything") ||
                             lowerMessage.includes("at once") ||
                             lowerMessage.includes("whole") ||
                             lowerMessage.includes("complete");
            initialVisibleCount = mvcMode === "PRECISION" ? 8 : 6;
            const displayLimit = 40;

            // -----------------------------------------------------------------
            // PIPELINE INCONSISTENCY DETECTION
            // -----------------------------------------------------------------
            if (rawProductCount > 0 && finalRankedList.length === 0) {
                console.warn("[PIPELINE_INCONSISTENCY] Retrieved products but output is empty.");
                const inconsistencyTrace = await TraceCollector.logExecution(
                    traceId,
                    decisionId,
                    "FILTERING" as any,
                    Date.now() - rankingStartTime, // Approx duration
                    { retrieved: rawProductCount, deduplicated: rawProductCount - deduplicatedCount, validated: rankingResult?.ranked?.length || 0 },
                    { severity: "CRITICAL", reason: `${rawProductCount} retrieved, 0 displayed`, finalCount: 0 },
                    "ERROR",
                    "PIPELINE_WIPEOUT"
                );
                sessionTraces.push(inconsistencyTrace);
            }

            // Safe Constraint Relaxation & Minimum Discovery Results
            const MIN_DISCOVERY_RESULTS = 4;
            if (interactionMode === "DISCOVERY" && finalRankedList.length < MIN_DISCOVERY_RESULTS && finalRankedList.length < rawProductCount) {
                // The list collapsed. We will NOT relax hard constraints (budget, adult, common sense).
                // But we CAN relax ranking thresholds and soft exclusions.
                // Since Kapruka V1 doesn't have an explicit score cutoff, we will just ensure we pad the list
                // with the highest-scoring rejected items from soft penalties, if we had any.
                // For now, if the list is dangerously small in Discovery mode, we skip diversity limits below to ensure maximum visibility.
            }

            // If the user explicitly requested a refinement (e.g. cheaper, premium, exclusion), 
            // we should NOT deduplicate against displayed items, because we are re-presenting the pool in a new way.
            const availableProducts = (refinementType === "more") 
                ? finalRankedList.filter((p: any) => !displayedIdsSet.has(p.id))
                : finalRankedList;
                
            productsList = [];
            const recentCategories: string[] = [];

            if (availableProducts.length === 0) {
                poolExhausted = true;
            } else {
                for (const p of availableProducts) {
                    if (productsList.length >= displayLimit) break;
                    const catCount = recentCategories.filter(c => c === p.category).length;
                    if (catCount < 2) {
                        productsList.push(p);
                        recentCategories.push(p.category);
                    }
                }
                if (productsList.length < displayLimit) {
                    for (const p of availableProducts) {
                        if (productsList.length >= displayLimit) break;
                        if (!productsList.find(x => x.id === p.id)) {
                            productsList.push(p);
                        }
                    }
                }
            }

            cacheRemaining = availableProducts.length - productsList.length;
            const newlyDisplayedIds = productsList.map((p: any) => p.id);
            const allDisplayedIds = [...Array.from(displayedIdsSet), ...newlyDisplayedIds];

            // Highlight Top 3
            const getBudgetRange = (amount: number): string => {
                if (amount <= 3000) return "BUDGET";
                if (amount <= 10000) return "MID";
                if (amount <= 50000) return "PREMIUM";
                return "LUXURY";
            };
            const budgetRangeStr = getBudgetRange(understandingPlan.budget?.target || 6000);

            productsList.forEach((prod: any, idx) => {
                if (idx < 3) prod.isHighlighted = true;
                const logEntry = logs.find(l => l.productId === prod.id);
                if (logEntry) {
                    logEntry.isDisplayed = true;
                    logEntry.isHighlighted = prod.isHighlighted;
                }

                // Track 'view' event for every recommended product
                logCommunityAction(
                    userId,
                    prod.id,
                    "view",
                    recipientVal,
                    occasionVal,
                    budgetRangeStr
                ).catch(e => console.error("Error logging view community action:", e));
            });

            // Save to Session Cache
            if (!poolExhausted && (plan.mcp_tool_needed === "kapruka_search_products" || sessionObj)) {
                const unfilteredPool = (plan.mcp_tool_needed === "kapruka_search_products")
                    ? (rankingResult?.ranked || finalRankedList)
                    : (sessionObj?.products || finalRankedList);

                await saveSearchSession({
                    chat_session_id: activeSessionId,
                    user_id: userId,
                    query: plan.mcp_search_query || sessionObj?.query || "show_more",
                    total_products: unfilteredPool.length,
                    displayed_count: allDisplayedIds.length,
                    displayed_ids: allDisplayedIds,
                    remaining_count: cacheRemaining,
                    products: unfilteredPool,
                    pool_version: sessionObj?.pool_version || `pool-${Date.now()}`,
                    refinement_history: refinementHistory,
                    active_exclusions: activeExclusions,
                    active_price_refinement: activePriceRefinement,
                    viewed_pages: viewedPages + (plan.mcp_tool_needed === "show_more" ? 1 : 0),
                    created_at: sessionObj?.created_at || new Date().toISOString()
                });
            }

            // TRANSPARENCY MESSAGING & FOLLOW-UPS
            transparencyMessage = "";
            followUpSuggestions = [];

            if (wasCacheExpired) {
                transparencyMessage = "Your previous recommendation session expired. I'll refresh the latest matching products and then apply the filter.";
                followUpSuggestions = ["Show more options"];
            } else if (targetPriceFallbackOptions.length > 0) {
                productsList = targetPriceFallbackOptions;
                transparencyMessage = `I couldn't find any products in that exact budget within the current recommendations. However, here are the closest alternatives starting at Rs. ${targetPriceFallbackOptions[0].price}. Would you like me to expand the search?`;
                followUpSuggestions = ["Expand the search", "Increase the budget", "Explore different categories"];
            } else if (poolExhausted) {
                // If they ask for more but we have no new items, re-display the top items so the UI doesn't crash 
                // and the LLM doesn't think the tool failed.
                productsList = finalRankedList.slice(0, 3);
                transparencyMessage = `You've seen all ${finalRankedList.length} matching products.`;
                followUpSuggestions = ["Search different categories", "Show cheaper alternatives", "Show premium options"];
            } else if (priceFilteredCount > 0) {
                transparencyMessage = `I reviewed the recommendation pool and found ${finalRankedList.length} products matching your price criteria. Here are the strongest matches.`;
                followUpSuggestions = ["Show more options"];
            } else if (newlyRemovedCount > 0) {
                if (cacheRemaining < 3) {
                    transparencyMessage = `I've removed ${newlyRemovedCount} items based on your preferences. However, this leaves very few matching products. Would you like me to explore other categories or relax the restriction?`;
                    followUpSuggestions = ["Explore other categories", "Start a broader search"];
                } else {
                    transparencyMessage = `I've removed ${newlyRemovedCount} products from the recommendation pool and replaced them with alternative ideas that better match your preferences.`;
                    followUpSuggestions = ["Show more options", "Show cheaper alternatives"];
                }
            } else if (finalRankedList.length > productsList.length) {
                if (finalRankedList.length > 20) {
                    transparencyMessage = "I reviewed over twenty matching products and selected the recommendations that fit your request most closely.";
                } else if (finalRankedList.length > 10) {
                    transparencyMessage = "I found a number of products that fit your request and selected the best matches to make your decision easier.";
                } else {
                    transparencyMessage = "I found a few matching products and selected the strongest recommendations.";
                }
                followUpSuggestions = ["Show more options", "Show cheaper alternatives", "Show premium options"];
            }

            traceReport = {
                trace_id: traceId,
                user_id: userId,
                query: message,
                mode,
                raw_product_count: rawProductCount,
                deduplicated_count: deduplicatedCount,
                filtered_count: filteredCount,
                semantic_removed_count: semanticRemovedCount,
                ranked_count: finalRankedList.length,
                displayed_count: allDisplayedIds.length,
                cache_remaining: cacheRemaining,
                trace_data: logs,
                context_override: plan.is_context_override || false,
                previous_budget: previousBudget,
                current_budget: understandingPlan.budget?.target || profile?.average_budget,
                community_penalties_applied: communityPenaltiesApplied,
                pool_version: sessionObj?.pool_version,
                viewed_pages: viewedPages + (plan.mcp_tool_needed === "show_more" ? 1 : 0),
                refinements_applied: refinementHistory
            };

            toolExecutionTrace.status = "completed";
            toolResults = { status: "completed", data: productsList, transparencyMessage, followUpSuggestions };

            console.log("\n================ KAPPY OBSERVABILITY TRACE ================\n" + JSON.stringify(traceReport, null, 2) + "\n===========================================================\n");

            // Trigger Supabase Logging asynchronously
            const supabase = await createClient();
            supabase.from('recommendation_traces').insert({
                trace_id: traceReport.trace_id,
                user_id: userId,
                query: message,
                mode: traceReport.mode,
                raw_product_count: traceReport.raw_product_count,
                deduplicated_count: traceReport.deduplicated_count,
                cache_remaining: traceReport.cache_remaining,
                filtered_count: traceReport.filtered_count,
                ranked_count: traceReport.ranked_count,
                displayed_count: traceReport.displayed_count,
                trace_data: JSON.stringify({
                    lifecycle_logs: traceReport.trace_data,
                    extracted_intent: understandingPlan.intent,
                    extracted_budget_normalized: understandingPlan.budget,
                    extracted_recipient_entity: understandingPlan.extracted_recipient_entity,
                    selected_search_query: plan.mcp_search_query,
                    cache_status: plan.mcp_tool_needed === "show_more" ? "HIT" : plan.is_context_override ? "INVALIDATED" : "MISS",
                    history_retrieved: understandingPlan.needs_history || false,
                    history_target: understandingPlan.history_target || null
                })
            }).then((res: any) => {
                if (res.error) console.error("Trace logging failed:", res.error);
            });

            if (productsList.length === 0 && !(toolResults as any)?.clarification_needed) {
                let failureReasons = "";
                if (rawProductCount > 0) {
                    const rejectionReasons = new Set<string>();
                    logs.filter((l: any) => l.status === "rejected").forEach((l: any) => {
                        if (l.reasons) l.reasons.forEach((r: string) => rejectionReasons.add(r));
                    });
                    
                    if (rejectionReasons.size > 0) {
                        failureReasons = `CRITICAL FAILURE: I found ${rawProductCount} items, but ALL of them were filtered out for these reasons: ${Array.from(rejectionReasons).join(", ")}. Do NOT suggest any products. Do NOT say 'Kappy's Pick'. You MUST tell the user exactly why the products were filtered out and suggest adjusting their search.`;
                    } else {
                        failureReasons = `CRITICAL FAILURE: I found ${rawProductCount} items, but they were all filtered out because they didn't match the strict constraints (like budget or safety). Do NOT suggest any products. Do NOT say 'Kappy's Pick'. Please ask the user to adjust their search.`;
                    }
                } else {
                    failureReasons = `CRITICAL FAILURE: I couldn't find any products matching that request. Do NOT suggest any products. Do NOT say 'Kappy's Pick'. Please ask the user to try searching for something else.`;
                }

                toolExecutionTrace.status = "completed";
                toolResults = {
                    status: "completed",
                    data: {
                        products: [],
                        message: failureReasons
                    }
                };
            } else {
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: productsList };
            }

            if (plan.is_bundle_requested) {
                bundleOptions = generateBundleOptions(productsList as any[], understandingPlan.occasion?.type || null, understandingPlan.recipient?.type || null);
                toolResults = { status: toolExecutionTrace.status, data: { products: productsList, bundleSuggestions: bundleOptions, ...(productsList.length === 0 ? { message: "Products were completely irrelevant and filtered out." } : {}) } };
            }

        } else if (plan.mcp_tool_needed === "kapruka_track_order" && plan.mcp_search_query) {
            const rawTrack = (await mcpTrackOrder(plan.mcp_search_query)) as {
                status?: string;
                status_display?: string;
                delivery_date?: string;
                progress?: Array<{ step: string; timestamp: string }>;
                recipient?: { name: string; phone: string; address: string; city: string };
                amount?: { value: string; currency: string } | string;
            } | { error?: string } | null;
            if (rawTrack && !('error' in rawTrack) && (rawTrack as any).status) {
                trackingData = {
                    orderNumber: plan.mcp_search_query,
                    statusText: (rawTrack as any).status_display || (rawTrack as any).status || "In Transit",
                    estimatedArrival: (rawTrack as any).delivery_date || "TBD",
                    recipientName: (rawTrack as any).recipient?.name || "",
                    recipientCity: (rawTrack as any).recipient?.city || "",
                    grandTotal: typeof (rawTrack as any).amount === "object" ? `${(rawTrack as any).amount.currency} ${(rawTrack as any).amount.value}` : `${(rawTrack as any).amount || ""}`,
                    steps: ((rawTrack as any).progress || []).map((step: { step: string; timestamp: string }) => ({
                        name: step.step,
                        status: "done",
                        time: step.timestamp
                    }))
                };
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: trackingData };
            } else {
                toolExecutionTrace.status = "failed";
                toolExecutionTrace.error_details = "Track order failed or returned null.";
                toolResults = { status: "failed", error: "Track order failed or returned null." };
            }
        } else if (plan.mcp_tool_needed === "kapruka_check_delivery" && plan.mcp_search_query) {
            const cityQuery = plan.mcp_search_query;
            const matchedCities = await mcpListDeliveryCities(cityQuery);
            
            if (matchedCities.length === 0) {
                // No matches, call delivery check directly with user query
                const rawDel = await mcpCheckDelivery(cityQuery);
                if (rawDel) {
                    toolExecutionTrace.status = "completed";
                    toolResults = { status: "completed", data: rawDel };
                } else {
                    toolExecutionTrace.status = "failed";
                    toolResults = { status: "failed", error: `We couldn't check delivery for "${cityQuery}".` };
                }
            } else if (matchedCities.length === 1) {
                // Single match, use canonical name
                const canonicalCity = matchedCities[0].name || matchedCities[0];
                const rawDel = await mcpCheckDelivery(canonicalCity);
                if (rawDel) {
                    toolExecutionTrace.status = "completed";
                    toolResults = { status: "completed", data: { ...rawDel, city: canonicalCity } };
                } else {
                    toolExecutionTrace.status = "failed";
                    toolResults = { status: "failed", error: `We couldn't check delivery for "${canonicalCity}".` };
                }
            } else {
                // Ambiguous matches, ask for clarification
                const cityNames = matchedCities.slice(0, 5).map((c: any) => c.name || c);
                toolExecutionTrace.status = "clarification";
                toolResults = {
                    clarification_needed: true,
                    message: `I found multiple matching delivery areas for "${cityQuery}". Which one did you mean?`,
                    followUpSuggestions: cityNames
                };
            }
        } else if (plan.mcp_tool_needed === "kapruka_get_product" && plan.mcp_search_query) {
            const rawProd = await mcpGetProduct(plan.mcp_search_query);
            if (rawProd) {
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: rawProd };
            } else {
                toolExecutionTrace.status = "failed";
                toolExecutionTrace.error_details = "Get product failed or returned null.";
                toolResults = { status: "failed", error: "Get product failed or returned null." };
            }
        } else if (plan.mcp_tool_needed === "kapruka_list_categories") {
            const rawCats = await mcpListCategories();
            const categoryNames = rawCats.map((c: any) => c.name || c);
            toolExecutionTrace.status = "completed";
            toolResults = { 
                status: "completed", 
                data: { categories: rawCats },
                followUpSuggestions: categoryNames.slice(0, 8)
            };
        } else if (plan.mcp_tool_needed === "kapruka_list_delivery_cities") {
            const rawCities = await mcpListDeliveryCities();
            const cityNames = rawCities.map((c: any) => c.name || c);
            toolExecutionTrace.status = "completed";
            toolResults = { 
                status: "completed", 
                data: { cities: rawCities },
                followUpSuggestions: cityNames.slice(0, 8)
            };
        }

        if (plan.mcp_tool_needed || plan.is_task_cancelled) {
            console.log("\n================ TOOL EXECUTION TRACE ================\n" + JSON.stringify(toolExecutionTrace, null, 2) + "\n======================================================\n");
        }

        // Gift message crafting trigger
        if (plan.gift_message_needed && plan.gift_message_tone) {
            giftMessageOptions = craftGiftMessageOptions(understandingPlan.occasion?.type || "any", plan.gift_message_tone as any);
            toolResults = { giftMessages: giftMessageOptions };
        }

        // 6. HUMANIZATION PHASE (generate natural persona response)

        // SESSION RECOVERY (Algorithm 26): Warm returning-user greeting when memory exists but conversation is fresh
        const isNewConversation = !history || (Array.isArray(history) && history.length <= 1);
        const hasExistingMemory = relationships.length > 0 || preferences.length > 0;
        const sessionRecoveryContext = isNewConversation && hasExistingMemory
            ? `\n[SESSION RECOVERY — ALGORITHM 26]\nThis user is returning. They have saved memory:\n- Relationships: ${JSON.stringify(relationships.map(r => r.relationship_type))}\n- Preferences: ${JSON.stringify(preferences.map(p => p.interest))}\nGreet them warmly, reference the most recent context naturally, and give them the option to continue or start fresh. Do NOT list all their data — just reference one relevant detail.
`
            : "";

        // Earned Familiarity Engine: Determine relationship strength based on interactions
        const interactionCount = behaviorProfile.total_interactions + (history ? history.length : 0);

        let detectedTone = activePersona.tone as string;
        if (activePersona.primary_language === "Singlish" || activePersona.primary_language === "Mixed English + Singlish") {
            detectedTone = "singlish_casual";
        } else if (activePersona.primary_language === "Tanglish" || activePersona.primary_language === "Mixed English + Tamil") {
            detectedTone = "tanglish_casual";
        }

        // Generate a strict recipient-filtered context block to prevent memory bleed
        const filteredUserContextBlock = await buildUserContext(userId, understandingPlan.recipient?.type);

        // Relationship-Strength Scoring (Overridden by Mirroring Precedence)
        const effectiveToneInstruction = `[RELATIONSHIP STRENGTH: ${interactionCount < 3 ? 'LOW' : (userTone.confidence < 0.6 ? 'MEDIUM' : 'HIGH')} (Interactions: ${interactionCount})]
CRITICAL MIRRORING RULE:
You MUST mirror the user's detected active style under all circumstances:
- Primary Language: ${activePersona.primary_language}
- Script type: ${activePersona.script_type}
- Formality: ${activePersona.formality}
- Energy: ${activePersona.energy}
- Tone: ${activePersona.tone}
Even if relationship strength is LOW, do NOT use a neutral/polite formal English tone unless they are speaking in that style. Mirroring has absolute precedence.`;

        const replacedPersonaInstruction = KAPPY_PERSONA_INSTRUCTION
            .replace("{USER_PRIMARY_LANGUAGE}", activePersona.primary_language)
            .replace("{USER_SCRIPT}", activePersona.script_type)
            .replace("{USER_FORMALITY}", activePersona.formality)
            .replace("{USER_ENERGY}", activePersona.energy)
            .replace("{USER_TONE}", activePersona.tone);

        const finalHumanizerPrompt = `
${replacedPersonaInstruction}

[USER BEHAVIORAL PROFILE & STAGE]
- Name: ${userName}
- Personality stage: ${behaviorProfile?.personality_stage || "new_acquaintance"}
- Relationship strength: ${(behaviorProfile?.relationship_strength || 0).toFixed(2)}
- Favorite categories: ${(behaviorProfile?.favorite_categories || []).join(", ") || "None yet"}
- Standard budget range: Min: ${behaviorProfile?.favorite_price_range?.min || 0} LKR, Max: ${behaviorProfile?.favorite_price_range?.max || 0} LKR

[ACTIVE SHOPPING JOURNEY]
- Occasion: ${snapshot?.occasion || "None specified"}
- Recipient: ${snapshot?.recipient || "None specified"}
- Completed/Pending Stages: ${snapshot?.journeyState || "IDLE"}

[ACTIVE USER CONTEXT (Filtered for ${understandingPlan.recipient?.type || 'General'})]
${filteredUserContextBlock}

[ADAPTIVE COMMUNICATION STYLE — CRITICAL]
${effectiveToneInstruction}

[STRUCTURED HISTORY SUMMARY]
${structuredMemorySummary}

[CURRENT SESSION HISTORY]
${chatHistoryContext}

[USER'S CURRENT REQUEST]
"${message}"

[ORCHESTRATION CONTEXT]
- Intent Classification: ${understandingPlan.intent}
- Recipient: ${understandingPlan.recipient?.type || "N/A"}
- Occasion: ${understandingPlan.occasion?.type || "N/A"}
- Target Budget: ${understandingPlan.budget?.target || profile.average_budget} LKR
- Emotion Detected: ${understandingPlan.emotion || "neutral"}
- Delivery City/Date: ${plan.delivery_city || "N/A"} / ${plan.delivery_date || "N/A"}
- Tool Results: ${JSON.stringify(toolResults)}

[FINAL EXECUTION RULES]
Based on the Master System Prompt rules and the above context, generate Kapri's response.
1. ALWAYS prioritize matching the EMOTIONAL state detected: ${understandingPlan.emotion || "neutral"}.
2. Check the "WHERE ARE WE IN THE JOURNEY?" rule (Section 1.6) and take ONLY ONE action.
3. If products are shown, you MUST designate the FIRST product in the list (index 0 in the Tool Results data) as Kapri's Pick (Kappy's Pick) in your text and provide a warm human reason for it. Do not choose any other product as your pick/suggestion.
4. DO NOT list products, prices, or images in your text. The UI automatically renders them below your message. Just refer to them naturally.
5. EXPLICIT TOOL STATUS RULES:
   - If Tool Results status is "failed", DO NOT say "Let me check" or "Hang tight". Acknowledge the failure honestly ("I couldn't retrieve that information right now. Want me to try again?").
   - If Tool Results status is "cancelled", acknowledge the cancellation naturally ("No problem at all! What else can I help with?").
   - If Tool Results indicate clarification_needed is true, you MUST ask the user the exact clarification message provided in the tool results, but ALWAYS translate it seamlessly into the exact language and tone the user is currently speaking in. Do NOT just output the English message if they are speaking Sinhala/Singlish or Tamil.
6. If the active Recipient is "None specified" or "General", or if no specific recipient is determined, you MUST NOT assume, mention, or suggest any specific relationship or recipient (e.g., "mom", "mother", "girlfriend", "dad") in your text response. Keep references generic (e.g., "someone special" or "your recipient").
7. SINGLISH/SINHALA ACCURACY RULE: If responding in Singlish or Sinhala, speak NATURAL, spoken Sri Lankan conversational dialect. NEVER use literal word-for-word machine translation (e.g. NEVER say "mama hitapan", "chande thiyena nisa", or nonsensical words). Keep it natural (e.g., "Poddak inna balanna", "Meka maru", "Ow puluwan").
${understandingPlan.intent === "GREETING" ? `8. GREETING MODE RULES:
   - The user just greeted you. Keep it warm, casual, and friendly.
   - Greet the user by their name: "${userName}" if it is not "friend". Otherwise, use a friendly Sri Lankan term ("machan", "macha", "buddy") or language-appropriate greeting.
   - DO NOT list or suggest any products.
   - Prompt them naturally to tell you what they would like to search for today.
   - Use the language they used:
     - English: e.g., "Hey [Name]! Whats up? What are we gonna search for today?"
     - Sinhala/Singlish: e.g., "Kohomada [Name]? Ada mokakda search karanna one?"
     - Tamil/Tanglish: e.g., "Enna [Name], eppadi irukkinga? Inniku enna search panna porom?"
` : (understandingPlan.intent === "EXPLORATION" ? `8. EXPLORATION MODE RULES:
   - The user doesn't know what they want. You have pulled some products to inspire them. Present them casually, not as definitive recommendations (e.g., 'Let me show you some things people love' or 'Here are some ideas to get you started').
   - Naturally ask the refinement/lead question below to narrow down their intent.
` : (understandingPlan.intent === "PRODUCT_REJECTION" ? `8. PRODUCT REJECTION RULES:
   - The user rejected a category (e.g., flowers or mugs).
   - Confirm that you've filtered out the rejected category (e.g., "Got it! No flowers. I've updated the list to show other options instead!").
   - Keep it friendly, positive, and light.
   - Present the updated list of recommendations naturally.
` : ""))}
${understandingPlan.intent !== "GREETING" && understandingPlan.intelligenceData?.nextQuestion && understandingPlan.intelligenceData.nextQuestion !== "None" ? `9. PROGRESSIVE REFINEMENT RULE:
   - You MUST ask the following refinement question at the very end of your response after naturally introducing the products.
   - Refinement Question: "${understandingPlan.intelligenceData.nextQuestion}"` : (understandingPlan.intent === "GREETING" ? "" : `9. DO NOT ask any follow-up questions or clarification questions. Just introduce the products naturally.`)}
`;

        // Retrieve active context tags from database for fallback
        const updatedPrefs = await getPreferences(userId);
        const updatedRels = await getRelationships(userId);

        // Calculate dynamic active context tags based on CURRENT understanding
        const dynamicContextTags: string[] = [];
        const finalRecipient = understandingPlan.extracted_recipient?.type || snapshot?.recipient;
        if (finalRecipient) {
            dynamicContextTags.push(`Recipient: ${finalRecipient}`);
        }
        
        const finalOccasion = understandingPlan.extracted_occasion?.type || snapshot?.occasion;
        if (finalOccasion) {
            dynamicContextTags.push(`Occasion: ${finalOccasion}`);
        }
        
        const finalProductType = understandingPlan.extracted_product_type?.type || snapshot?.searchSession?.query;
        if (finalProductType) {
            dynamicContextTags.push(`Looking for: ${finalProductType}`);
        }
        
        const finalBudget = understandingPlan.budget?.target || snapshot?.budget;
        if (finalBudget) {
            dynamicContextTags.push(`Budget: ~Rs. ${finalBudget}`);
        }

        // Removed fallback to persistent memory if no active context is specified to prevent UI context bleed
        // activeContextTags should strictly contain relevant contextual memories

        const saveGodModeTrace = async () => {
            try {
                const capturedStore = godModeStorage.getStore();
                if (capturedStore) {
                    const supabaseClient = await createClient();
                    
                    // Compile confidence explanations
                    const positive: string[] = [];
                    const negative: string[] = [];
                    if (understandingPlan.budget?.target) positive.push("Budget identified");
                    else negative.push("Budget limit not set");
                    
                    if (understandingPlan.recipient?.type && understandingPlan.recipient.type !== "unknown") positive.push("Recipient identified");
                    else negative.push("Recipient preferences unknown");
                    
                    if (understandingPlan.occasion?.type && understandingPlan.occasion.type !== "unknown") positive.push("Occasion identified");
                    else negative.push("Occasion not specified");
                    
                    if (productsList && productsList.length > 0) positive.push("Candidate products matched successfully");
                    else negative.push("No catalog matching products found");

                    const confidenceExplanation = { positive, negative };

                    // Compile session summary
                    const sessionSummary = {
                        intent: understandingPlan.intent || "unknown",
                        recipient: understandingPlan.recipient?.type || "unknown",
                        occasion: understandingPlan.occasion?.type || "unknown",
                        budget: understandingPlan.budget?.target || null,
                        evaluatedCount: rawProductCount || 0,
                        filteredCount: (deduplicatedCount || 0) + (filteredCount || 0) + (semanticRemovedCount || 0),
                        winningProductId: productsList[0]?.id || null,
                        winningProductName: productsList[0]?.name || null,
                        confidence: intelligence.recommendationConfidence || 0.5,
                        durationMs: Date.now() - traceStartTime
                    };

                    const { LearningEvidenceService } = await import("@/lib/intelligence/observability/godmode/learningEvidenceService");
                    const learningProfile = await LearningEvidenceService.getLearningProfile(userId);

                    const { error: insertError } = await supabaseClient.from("godmode_traces").insert({
                        trace_id: traceId,
                        user_id: userId,
                        telemetry_events: capturedStore.telemetryEvents,
                        product_lifecycles: Object.values(capturedStore.productLifecycles),
                        replay_steps: capturedStore.replaySteps,
                        learning_profile: learningProfile,
                        confidence_explanation: confidenceExplanation,
                        session_summary: sessionSummary,
                        engine_health: capturedStore.engineHealth
                    });
                    if (insertError) {
                        import('fs').then(fs => fs.appendFileSync('telemetry_error.log', 'Insert Error: ' + JSON.stringify(insertError) + '\n'));
                    }
                }
            } catch (telemetryError: any) {
                console.error("Failed to persist God Mode telemetry:", telemetryError);
                import('fs').then(fs => fs.appendFileSync('telemetry_error.log', telemetryError?.message + '\n' + JSON.stringify(telemetryError) + '\n'));
            }
        };

        if (toolResults && (toolResults as any).guardrail_triggered) {
            const msg = (toolResults as any).message;
            // Guardrails bypass the LLM
            // Phase 5: Judge Mode Integration
            const { JudgeAdapter } = await import("@/lib/intelligence/observability/judgeAdapter");
            const rawTraces = (global as any).currentTraces || [];
            const judgePayload = JudgeAdapter.compress(activeSessionId, rawTraces);

            // Save persistent state asynchronously before bypassing stream
            try {
                await saveChatMessage(userId, activeSessionId, "assistant", msg, {
                    intent: understandingPlan.intent,
                    detected_tone: detectedTone,
                    products_shown: 0,
                    products_list: [],
                    traceId: traceId,
                    traceReport: { trace_id: traceId },
                    intelligenceTrace: judgePayload || null,
                    activeMemories: [...dynamicContextTags, ...activeContextTags]
                });
            } catch(e) { console.error("saveChatMessage err in bypass route", e); }

            try {
                await SessionSnapshotEngine.saveSnapshot(activeSessionId, {
                    journeyState: stateMachine.getCurrentState(),
                    recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.recipient),
                    occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.occasion),
                    budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.budget),
                    activeBundle: snapshot?.activeBundle || [],
                    recommendedProducts: [],
                    searchSession: {
                        query: understandingPlan.product_type || (shouldClearParams ? null : snapshot?.searchSession?.query),
                        recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.searchSession?.recipient),
                        occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.searchSession?.occasion),
                        budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.searchSession?.budget),
                        filters: shouldClearParams ? null : (understandingPlan.intelligenceData?.price_refinement || snapshot?.searchSession?.filters),
                        shownProducts: []
                    },
                    bundleSession: {
                        items: snapshot?.activeBundle || [],
                        total: snapshot?.activeBundle?.reduce((acc: number, item: any) => acc + (item.price || 0), 0) || 0,
                        recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.bundleSession?.recipient),
                        occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.bundleSession?.occasion),
                        budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.bundleSession?.budget)
                    },
                    askedQuestions: [
                        ...(snapshot?.askedQuestions || []),
                        ...(winner?.action === "CLARIFY" && (winner as any).targetField ? [(winner as any).targetField] : [])
                    ],
                    sessionPersona: activePersona
                });
            } catch(e) { console.error("saveSnapshot err in bypass route", e); }

            // Save God Mode telemetry before early return
            await saveGodModeTrace();

            // We use a minified JSON response for the bypass message to trigger the fallback in ChatWindow
            return new NextResponse(JSON.stringify({
                role: "assistant",
                content: msg,
                activeMemories: [...dynamicContextTags, ...activeContextTags],
                traceReport: { trace_id: traceId },
                intelligenceTrace: intelligence?.traces || null,
                judgeModeTrace: judgePayload,
                followUpSuggestions: (toolResults as any).followUpSuggestions || null
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Phase 5: Judge Mode Integration (Normal Stream)
        const { JudgeAdapter } = await import("@/lib/intelligence/observability/judgeAdapter");
        const judgePayload = JudgeAdapter.compress(activeSessionId, sessionTraces);

        // 7. STREAM FINAL RESPONSE TO FRONTEND
        const data = new StreamData();
        const dataPayload: any = {
            activeMemories: [...dynamicContextTags, ...activeContextTags],
            traceReport: traceReport || { trace_id: traceId },
            intelligenceTrace: intelligence?.traces || null,
            judgeModeTrace: judgePayload,
            transparencyMessage: transparencyMessage || (toolResults as any)?.transparencyMessage || null,
            followUpSuggestions: followUpSuggestions?.length ? followUpSuggestions : ((toolResults as any)?.followUpSuggestions || null)
        };
        if (productsList.length > 0) {
            dataPayload.products = productsList;
            dataPayload.isAllRequested = isAllRequested;
            dataPayload.initialVisibleCount = initialVisibleCount;

            // --- KAPPY INTELLIGENCE ENGINE V1: DECISION SUPPORT & CONFIDENCE ---
            const { DecisionSupportEngine } = await import("@/lib/intelligence/decision/decisionSupport");
            const decision = DecisionSupportEngine.evaluate(productsList as any);
            dataPayload.decisionSupport = decision;

            const { ConfidenceBuilder } = await import("@/lib/intelligence/confidence/confidenceBuilder");
            const reassurances = ConfidenceBuilder.evaluate(understandingPlan.intelligenceData || understandingPlan);
            dataPayload.reassurances = reassurances;
            // -------------------------------------------------------------------
        }
        if (trackingData) dataPayload.tracking = trackingData;

        data.append(dataPayload);

        const { selectFewShots } = await import("@/lib/fewShotLibrary");
        
        // Only inject few-shots if the active persona's primary language is NOT English,
        // AND there is some localized slang detected in the message or active persona history,
        // or the message contains common Sri Lankan / local chat markers.
        const isLocalized = activePersona.primary_language !== "English" && 
                            ((activePersona.detected_slang && activePersona.detected_slang.length > 0) || 
                             message.toLowerCase().includes("machan") || 
                             message.toLowerCase().includes("macha") || 
                             message.toLowerCase().includes("ado") || 
                             message.toLowerCase().includes("aiyo") ||
                             message.toLowerCase().includes("ane") ||
                             message.toLowerCase().includes("patta") ||
                             message.toLowerCase().includes("ela") ||
                             message.toLowerCase().includes("hari"));

        let fewShots: any[] = [];
        if (isLocalized) {
            fewShots = await selectFewShots(
                message,
                understandingPlan.intent || "SHOPPING",
                activePersona.primary_language,
                activePersona.tone,
                understandingPlan.intelligenceData?.recommendationConfidence || 1.0,
                history || []
            );
        }

        const fewShotMessages: any[] = [];
        for (const example of fewShots) {
            fewShotMessages.push(
                { role: "user", content: example.user },
                { role: "assistant", content: example.assistant }
            );
        }

        let completion: any;
        try {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            completion = await openaiClient.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: finalHumanizerPrompt },
                    ...fewShotMessages,
                    { role: "user", content: message }
                ] as any,
                stream: true,
            });
        } catch (llmErr) {
            console.error("OpenAI Humanizer LLM error inside route.ts:", llmErr);
            const fallbackMsg = productsList.length > 0 
                ? "Here are the top options matching your request!" 
                : ((toolResults as any)?.message || "Here is what I found for your request.");
            
            try {
                await saveChatMessage(userId, activeSessionId, "assistant", fallbackMsg, {
                    intent: understandingPlan.intent,
                    detected_tone: detectedTone,
                    products_shown: productsList.length,
                    products_list: productsList,
                    isAllRequested,
                    initialVisibleCount,
                    tracking_data: trackingData,
                    bundleOptions: bundleOptions,
                    giftMessages: giftMessageOptions,
                    traceId: traceId || traceReport?.trace_id,
                    traceReport: traceReport || { trace_id: traceId },
                    intelligenceTrace: judgePayload || null,
                    activeMemories: [...dynamicContextTags, ...activeContextTags]
                });
            } catch (_) {}

            await saveGodModeTrace().catch(() => {});

            return new NextResponse(JSON.stringify({
                role: "assistant",
                content: fallbackMsg,
                products: productsList.length > 0 ? productsList : undefined,
                activeMemories: [...dynamicContextTags, ...activeContextTags],
                traceReport: traceReport || { trace_id: traceId },
                intelligenceTrace: intelligence?.traces || null,
                judgeModeTrace: judgePayload,
                followUpSuggestions: followUpSuggestions?.length ? followUpSuggestions : ((toolResults as any)?.followUpSuggestions || null)
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        const stream = OpenAIStream(completion, {
            onCompletion: async (text) => {
                try {
                    // Save persistent state asynchronously
                    await saveChatMessage(userId, activeSessionId, "assistant", text, {
                        intent: understandingPlan.intent,
                        detected_tone: detectedTone,
                        products_shown: productsList.length,
                        products_list: productsList,
                        isAllRequested,
                        initialVisibleCount,
                        tracking_data: trackingData,
                        bundleOptions: bundleOptions,
                        giftMessages: giftMessageOptions,
                        traceId: traceId || traceReport?.trace_id,
                        traceReport: traceReport || { trace_id: traceId },
                        intelligenceTrace: judgePayload || null,
                        activeMemories: [...dynamicContextTags, ...activeContextTags]
                    });
                } catch(e) { console.error("saveChatMessage err", e); }

                try {
                    // Save updated session snapshot with products, searchSession and bundleSession
                    await SessionSnapshotEngine.saveSnapshot(activeSessionId, {
                        journeyState: stateMachine.getCurrentState(),
                        recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.recipient),
                        occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.occasion),
                        budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.budget),
                        activeBundle: snapshot?.activeBundle || [],
                        recommendedProducts: productsList || [],
                        searchSession: {
                            query: understandingPlan.product_type || (shouldClearParams ? null : snapshot?.searchSession?.query),
                            recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.searchSession?.recipient),
                            occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.searchSession?.occasion),
                            budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.searchSession?.budget),
                            filters: shouldClearParams ? null : (understandingPlan.intelligenceData?.price_refinement || snapshot?.searchSession?.filters),
                            shownProducts: productsList || []
                        },
                        bundleSession: {
                            items: snapshot?.activeBundle || [],
                            total: snapshot?.activeBundle?.reduce((acc: number, item: any) => acc + (item.price || 0), 0) || 0,
                            recipient: understandingPlan.extracted_recipient?.type || (shouldClearParams ? null : snapshot?.bundleSession?.recipient),
                            occasion: understandingPlan.extracted_occasion?.type || (shouldClearParams ? null : snapshot?.bundleSession?.occasion),
                            budget: understandingPlan.budget?.target || (shouldClearParams ? null : snapshot?.bundleSession?.budget)
                        },
                        askedQuestions: [
                            ...(snapshot?.askedQuestions || []),
                            ...(winner?.action === "CLARIFY" && (winner as any).targetField ? [(winner as any).targetField] : [])
                        ],
                        sessionPersona: activePersona
                    });
                } catch(e) { console.error("saveSnapshot err", e); }

                try {
                    if (detectedTone && detectedTone !== "neutral") {
                        await updateUserTone(userId, detectedTone);
                    }
                } catch(e) { console.error("updateUserTone err", e); }

                // KAPPY GOD MODE TELEMETRY PERSISTENCE - Always persist telemetry
                await saveGodModeTrace();

                data.close();
            }
        });

        return new StreamingTextResponse(stream, {}, data);

    } catch (error: unknown) {
        console.error("Kappy Reasoning Loop Error:", error);

        const errMsg = error instanceof Error ? error.stack || error.message : (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
        
        // Record failure in Circuit Breaker
        try {
            const { CircuitBreaker } = await import("@/lib/intelligence/services/circuitBreaker");
            CircuitBreaker.recordFailure();
        } catch (_) {}

        const errorType = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")
            ? "rate_limit_exceeded"
            : errMsg.includes("OpenAI") || errMsg.includes("openai") ? "llm_failure" 
            : errMsg.includes("Database") || errMsg.includes("supabase") || errMsg.includes("db") ? "database_failure" 
            : "orchestrator_failure";

        const generatedTraceId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Log the failure execution trace
        try {
            await TraceCollector.logExecution(
                traceId,
                decisionId,
                "UNDERSTANDING",
                0,
                { error: errMsg },
                { error_type: errorType, trace_id: generatedTraceId },
                "ERROR"
            );
        } catch (_) {}

        let friendlyMsg = "Machan, sorry, my brain encountered a temporary glitch. Let's try again in a bit! 😕";
        if (errorType === "rate_limit_exceeded") {
            friendlyMsg = "I'm a bit overloaded right now 😅 Could you try again in just a moment?";
        }

        const safetyTimeline = [
            { stepIndex: 1, title: "Exception Handler", description: `Error: ${errorType}. Details: ${errMsg.slice(0, 100)}`, durationMs: 0, status: "ERROR" }
        ];

        return new NextResponse(JSON.stringify({
            success: false,
            error_type: errorType,
            user_message: friendlyMsg,
            trace_id: generatedTraceId,
            recoverable: true,
            role: "assistant",
            content: `${friendlyMsg} (Trace ID: ${generatedTraceId})`,
            judgeModeTrace: {
                timeline: safetyTimeline,
                featureFlags: { personalization: false, memories: false },
                totalDurationMs: 0,
                confidences: { intent: 0.0, memory: 0.0, recommendation: 0.0 }
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
