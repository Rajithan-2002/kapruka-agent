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

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { KAPPY_PERSONA_INSTRUCTION } from "@/lib/masterPrompt";

export async function POST(request: Request) {
    // Initialize trace and decision ids for full pipeline correlation
    const traceId = randomUUID();
    const decisionId = randomUUID();
    const sessionTraces: any[] = [];
    const traceStartTime = Date.now();

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

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
        const firstName = fullName ? fullName.split(" ")[0] : "";
        const userName = firstName || "friend";

        const { message, history, sessionId } = await request.json();
        const activeSessionId = sessionId || `session-${Date.now()}`;

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

        // 3. Rank Relevance based on extracted context
        const contextType = "GENERAL"; // Simple mapping, could be expanded
        const relevanceResult = MemoryRelevanceEngine.rankMemories(message, decayedMemories, contextType);

        // Map relevant memories to Context Tags using Presentation Layer
        let activeContextTags = relevanceResult.relevantMemories.map(m => {
            const rendered = MemoryPresentationLayer.renderMemory(m);
            return `${rendered.category}: ${rendered.text}`;
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
        await createConversation(userId, activeSessionId);

        // Save the user's message to persistent chat history
        await saveChatMessage(userId, activeSessionId, "user", message, { intent: "pending" });

        // Trigger auto-titling for new chats (less than 2 messages in session history)
        if (!history || history.length <= 1) {
            generateConversationTitle(userId, activeSessionId, message).catch(console.error);
        }

        // 2. INTELLIGENCE ENGINE (V1)
        const { IntelligenceOrchestrator } = await import("@/lib/intelligence/orchestrator/intelligenceOrchestrator");
        const orchestrator = new IntelligenceOrchestrator();
        const intelligence = await orchestrator.processRequest(userId, message, history || []);

        console.log("Kappy Intelligence Engine Plan:", JSON.stringify(intelligence, null, 2));

        if (intelligence && intelligence.traces) {
            for (const t of intelligence.traces) {
                const loggedTrace = await TraceCollector.logExecution(
                    traceId,
                    decisionId,
                    "UNDERSTANDING",
                    t.latencyMs || 0,
                    t.inputs || { message },
                    { reasoning: t.reasoning, confidence: t.confidence },
                    "HEALTHY"
                );
                sessionTraces.push(loggedTrace);
            }
        }

        // Create a backward-compatible understandingPlan for legacy route.ts logic
        const understandingPlan: any = {
            intent: intelligence.intent,
            is_shopping_request: ["SHOPPING", "GIFTING", "REORDER", "BROWSING", "PRICE_REFINEMENT", "PREFERENCE_CORRECTION", "EXPLORATION"].includes(intelligence.intent || ""),
            unsupported_domain: null,
            product_type: intelligence.product_type || "UNKNOWN",
            situation: intelligence.situation,
            extracted_product_type: { type: message, confidence: 1.0 }, // Fallback to raw message for search
            extracted_recipient: { type: intelligence.situation?.recipient !== "UNKNOWN" ? intelligence.situation?.recipient : null, confidence: 1.0 },
            extracted_occasion: { type: intelligence.situation?.occasion !== "UNKNOWN" ? intelligence.situation?.occasion : null, confidence: 1.0 },
            budget: intelligence.situation?.budget?.max ? { target: intelligence.situation.budget.max } : null,
            needs_history: false,
            emotion: intelligence.psychology?.primaryTrigger || "neutral",
            mapped_category: intelligence.mapped_category || "UNKNOWN",
            intelligenceData: intelligence
        };

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
        if (exactMessage === "🎂 Gift for someone") {
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
            "ayubowan", "ayubowang", "subha dawasak", "subha udasanak", "subha sandhyawak", "machan", "macha", "ado", "kohomada", "sapa", "sapa kiyala", "koheda", "halow", "halo",
            // Tamil
            "vanakkam", "vanakam", "வணக்கம்", "machi", "thala", "thalaiva", "sari", "enna machi", "nalla irukkingala", "nalama"
        ];
        
        const cleanMessage = message.trim().toLowerCase().replace(/[^a-z0-9\s\u0B80-\u0BFF]/g, '');
        const words = cleanMessage.split(/\s+/);
        
        const hasGreeting = words.some((w: string) => greetingKeywords.includes(w)) || 
                            greetingKeywords.some((g: string) => cleanMessage === g || cleanMessage.startsWith(g + " "));

        if (hasGreeting || understandingPlan.intent === "GREETING" || understandingPlan.intent === "SMALL_TALK") {
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
        const { BypassRule, TrackOrderRule } = await import("@/lib/intelligence/orchestrator/rules/foundational/basicRules");
        const { ClarificationRule, SearchProductsRule, ShowMoreRule } = await import("@/lib/intelligence/orchestrator/rules/shopping/shoppingRules");

        const engine = new RuleEngine();
        engine.registerRule(new BypassRule());
        engine.registerRule(new TrackOrderRule());
        engine.registerRule(new ClarificationRule());
        engine.registerRule(new SearchProductsRule());
        engine.registerRule(new ShowMoreRule());

        const { SessionSnapshotEngine } = await import("@/lib/intelligence/state/sessionSnapshot");
        const { JourneyStateMachine } = await import("@/lib/intelligence/state/journeyStateMachine");

        let snapshot = await SessionSnapshotEngine.loadSnapshot(activeSessionId);
        const stateMachine = new JourneyStateMachine(snapshot ? snapshot.journeyState : "IDLE");

        const ruleContext = {
            understandingPlan,
            journeyState: stateMachine.getCurrentState(),
            sessionSnapshot: snapshot,
            message
        };

        const { winner, trace } = engine.evaluate(ruleContext);
        let plan = ActionRouter.mapDecision(winner, understandingPlan.intent);

        // ------------------------------------------------------------
        // INTENT + STATE ROUTING GUARDRAIL
        // Prevent "hi" from triggering searches or recommendations.
        // ------------------------------------------------------------
        if (understandingPlan.intent === "GREETING") {
            const confidence = understandingPlan.intelligenceData?.recommendationConfidence || 0;
            const state = stateMachine.getCurrentState() as any;
            
            // If it's a greeting, confidence is low, and we aren't in the middle of a checkout
            if (confidence < 0.8 && state !== "EXPECTING_SELECTION" && state !== "PROCEED_TO_CHECKOUT") {
                console.log("[Guardrail] Greeting detected with low confidence/idle state. Bypassing shopping pipeline.");
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

        // Save new state
        await SessionSnapshotEngine.saveSnapshot(activeSessionId, {
            journeyState: stateMachine.getCurrentState(),
            recipient: understandingPlan.extracted_recipient?.type || snapshot?.recipient,
            occasion: understandingPlan.extracted_occasion?.type || snapshot?.occasion,
            budget: understandingPlan.budget?.target || snapshot?.budget,
            activeBundle: snapshot?.activeBundle || [],
            recommendedProducts: snapshot?.recommendedProducts || []
        });

        // 5. EXECUTE MCP TOOL OR RUN LOGIC
        let toolResults: unknown = null;
        let productsList: any[] = [];
        let isAllRequested = false;
        let initialVisibleCount = 6;
        let previousSearchSession: any | null = null;
        let trackingData: any = null;
        let traceReport: any = null;
        // Track bundle creation state
        let bundleOptions: unknown[] = [];
        // Track gift message state
        let giftMessageOptions: unknown[] = [];

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
            const recipientVal = understandingPlan.recipient?.type || "mother";
            const occasionVal = understandingPlan.occasion?.type || "birthday";
            const mode = plan.recommendation_mode || "recommendation";
            let finalRankedList: any[] = [];
            let cacheRemaining = 0;
            let rawProductCount = 0;
            let filteredCount = 0;
            let semanticRemovedCount = 0;
            let deduplicatedCount = 0;
            let traceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
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
                    if ((understandingPlan.intent === "PREFERENCE_CORRECTION" || understandingPlan.intent === "PRICE_REFINEMENT") && (!understandingPlan.product_type || understandingPlan.product_type === "UNKNOWN" || understandingPlan.product_type === message)) {
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
                            plan.mcp_search_query = (understandingPlan.product_type && understandingPlan.product_type !== "UNKNOWN") ? understandingPlan.product_type : message;
                        }
                    }
                }
            }

            if (plan.mcp_tool_needed === "kapruka_search_products") {
                const translatedQuery = await translateSearchQuery(plan.mcp_search_query || "");
                const rawProducts = await mcpSearchProducts(translatedQuery, 40);
                rawProductCount = rawProducts.length;

                // Map to standardized format using ProductAdapter
                const mappedProducts: CanonicalProductV1[] = rawProducts.map(p => ProductAdapter.adaptMCPProduct(p));
                ProductAdapter.assertCanonicalProducts(mappedProducts, "MCP Retrieval");

                // 1. Deduplication First
                const dedupedProducts = deduplicateProducts(mappedProducts, "Kapruka Search Recommendations");
                deduplicatedCount = rawProducts.length - dedupedProducts.length;

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
                        mappedCategory: understandingPlan.mapped_category || "UNKNOWN"
                    },
                    logs
                );

                filteredCount = validationResult.rejected.length;
                logs = validationResult.logs;

                // 3. Scoring Engine
                const dedupedIds = new Set(validationResult.approved.map((p: any) => p.id));
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
                    situation: understandingPlan.occasion?.type || "birthday",
                    recipient: understandingPlan.recipient?.type || "mother",
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
                    isBudgetExplicit: !!understandingPlan.budget?.target
                };

                rankingStartTime = Date.now();
                const rankedCandidates = RankingEngine.rankProducts(approvedMcpProducts, rankingContext);
                
                // --- STAGE 3: SEMANTIC GARBAGE FILTER ---
                const { runSemanticIrrelevanceFilter } = await import("@/lib/intelligence/recommendation/semanticFilter");
                const irrelevantIds = await runSemanticIrrelevanceFilter(
                    plan.shopping_stage || plan.mcp_search_query || "",
                    understandingPlan.mapped_category || "UNKNOWN",
                    rankedCandidates.map(c => ({ id: c.productId, name: c.productData.name, category: c.productData.category }))
                );
                
                const finalSemanticRanked = rankedCandidates.filter(c => !irrelevantIds.includes(c.productId));
                semanticRemovedCount = rankedCandidates.length - finalSemanticRanked.length;
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
                    ranked: finalSemanticRanked.map(c => {
                        const p = c.productData;
                        p.score = c.finalScore; // Inject score
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

            const availableProducts = finalRankedList.filter((p: any) => !displayedIdsSet.has(p.id));
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
            let transparencyMessage = "";
            let followUpSuggestions: string[] = [];

            if (wasCacheExpired) {
                transparencyMessage = "Your previous recommendation session expired. I'll refresh the latest matching products and then apply the filter.";
                followUpSuggestions = ["Show more options"];
            } else if (targetPriceFallbackOptions.length > 0) {
                productsList = targetPriceFallbackOptions;
                transparencyMessage = `I couldn't find any products in that exact budget within the current recommendations. However, here are the closest alternatives starting at Rs. ${targetPriceFallbackOptions[0].price}. Would you like me to expand the search?`;
                followUpSuggestions = ["Expand the search", "Increase the budget", "Explore different categories"];
            } else if (poolExhausted) {
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
                toolExecutionTrace.status = "completed";
                toolResults = {
                    status: "completed",
                    data: {
                        products: [],
                        message: rawProductCount > 0 
                            ? "I found some items, but they were all filtered out because they didn't match your preferences (e.g. they contained items you dislike). Could you try a different search?"
                            : "I couldn't find any products matching that request. Could you try searching for something else?"
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
                estimated_delivery_date?: string;
                history?: Array<{ description: string; status: string; date: string }>;
            } | null;
            if (rawTrack) {
                trackingData = {
                    orderNumber: plan.mcp_search_query,
                    statusText: rawTrack.status || "In Transit",
                    estimatedArrival: rawTrack.estimated_delivery_date || "Tomorrow",
                    steps: (rawTrack.history || []).map((step: { description: string; status: string; date: string }) => ({
                        name: step.description,
                        status: step.status === "completed" ? "done" : step.status === "in_progress" ? "active" : "pending",
                        time: step.date
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
            const rawDel = await mcpCheckDelivery(plan.mcp_search_query);
            if (rawDel) {
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: rawDel };
            } else {
                toolExecutionTrace.status = "failed";
                toolExecutionTrace.error_details = "Delivery check failed or returned null.";
                toolResults = { status: "failed", error: "Delivery check failed or returned null." };
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
            toolExecutionTrace.status = "completed";
            toolResults = { status: "completed", data: { categories: rawCats } };
        } else if (plan.mcp_tool_needed === "kapruka_list_delivery_cities") {
            const rawCities = await mcpListDeliveryCities();
            toolExecutionTrace.status = "completed";
            toolResults = { status: "completed", data: { cities: rawCities } };
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

        const msgLower = message.toLowerCase();
        let detectedTone = understandingPlan.tone || "neutral";

        const singlishKeywords = ["machan", "ado", "hari", "eka", "mama", "mata", "aiyo", "ane", "patta", "ela"];
        const tanglishKeywords = ["macha", "da", "thala", "evlo", "romba", "nanba", "sari", "illa", "enna"];

        // Exact word match to detect user's current slang usage
        const toneWords = msgLower.split(/\s+/);
        if (toneWords.some((w: string) => singlishKeywords.includes(w))) {
            detectedTone = "singlish_casual";
        } else if (toneWords.some((w: string) => tanglishKeywords.includes(w))) {
            detectedTone = "tanglish_casual";
        }

        // Generate a strict recipient-filtered context block to prevent memory bleed
        const filteredUserContextBlock = await buildUserContext(userId, understandingPlan.recipient?.type);

        // Relationship-Strength Scoring
        const effectiveToneInstruction = `[RELATIONSHIP STRENGTH: ${interactionCount < 3 ? 'LOW' : (userTone.confidence < 0.6 ? 'MEDIUM' : 'HIGH')} (Interactions: ${interactionCount})]
CRITICAL TONE RULES:
- If LOW: START WITH A NEUTRAL, POLITE, AND PROFESSIONAL TONE. DO NOT use slang ("machan", "ado", "bro"). DO NOT use excessive emojis. You must earn familiarity. Example: "Hello! How can I help you today?"
- If MEDIUM: You may use casual English and natural emojis. No heavy Sri Lankan slang yet.
- If HIGH: You have earned familiarity. Mirror their exact style ("${userTone.tone}"). You may use "machan" or "ado" IF it matches their style.`;

        const finalHumanizerPrompt = `
${KAPPY_PERSONA_INSTRUCTION}

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
3. If products are shown, designate ONE as Kapri's Pick with a human reason.
4. DO NOT list products, prices, or images in your text. The UI automatically renders them below your message. Just refer to them naturally.
5. EXPLICIT TOOL STATUS RULES:
   - If Tool Results status is "failed", DO NOT say "Let me check" or "Hang tight". Acknowledge the failure honestly ("I couldn't retrieve that information right now. Want me to try again?").
   - If Tool Results status is "cancelled", acknowledge the cancellation naturally ("No problem at all! What else can I help with?").
${understandingPlan.intent === "GREETING" ? `6. GREETING MODE RULES:
   - The user just greeted you. Keep it warm, casual, and friendly.
   - Greet the user by their name: "${userName}" if it is not "friend". Otherwise, use a friendly Sri Lankan term ("machan", "macha", "buddy") or language-appropriate greeting.
   - DO NOT list or suggest any products.
   - Prompt them naturally to tell you what they would like to search for today.
   - Use the language they used:
     - English: e.g., "Hey [Name]! Whats up? What are we gonna search for today?"
     - Sinhala/Singlish: e.g., "Kohomada [Name]? Ada mokakda search karanna one?"
     - Tamil/Tanglish: e.g., "Enna [Name], eppadi irukkinga? Inniku enna search panna porom?"
` : (understandingPlan.intent === "EXPLORATION" ? `6. EXPLORATION MODE RULES:
   - The user doesn't know what they want. You have pulled some products to inspire them. Present them casually, not as definitive recommendations (e.g., 'Let me show you some things people love' or 'Here are some ideas to get you started').
   - Naturally ask the refinement/lead question below to narrow down their intent.
` : "")}
${understandingPlan.intent !== "GREETING" && understandingPlan.intelligenceData?.nextQuestion && understandingPlan.intelligenceData.nextQuestion !== "None" ? `7. PROGRESSIVE REFINEMENT RULE:
   - You MUST ask the following refinement question at the very end of your response after naturally introducing the products.
   - Refinement Question: "${understandingPlan.intelligenceData.nextQuestion}"` : (understandingPlan.intent === "GREETING" ? "" : `7. DO NOT ask any follow-up questions or clarification questions. Just introduce the products naturally.`)}
`;

        // Retrieve active context tags from database for fallback
        const updatedPrefs = await getPreferences(userId);
        const updatedRels = await getRelationships(userId);

        // Calculate dynamic active context tags based on CURRENT understanding
        const dynamicContextTags: string[] = [];
        if (understandingPlan.extracted_recipient?.type) {
            dynamicContextTags.push(`Recipient: ${understandingPlan.extracted_recipient.type}`);
        }
        if (understandingPlan.extracted_occasion?.type) {
            dynamicContextTags.push(`Occasion: ${understandingPlan.extracted_occasion.type}`);
        }
        if (understandingPlan.extracted_product_type?.type) {
            dynamicContextTags.push(`Looking for: ${understandingPlan.extracted_product_type.type}`);
        }
        if (understandingPlan.budget?.target) {
            dynamicContextTags.push(`Budget: ~Rs. ${understandingPlan.budget.target}`);
        }

        // Removed fallback to persistent memory if no active context is specified to prevent UI context bleed
        // activeContextTags should strictly contain relevant contextual memories

        if (toolResults && ((toolResults as any).guardrail_triggered || (toolResults as any).clarification_needed)) {
            const msg = (toolResults as any).message;
            // Guardrails and Clarifications bypass the LLM
            // Phase 5: Judge Mode Integration
            const { JudgeAdapter } = await import("@/lib/intelligence/observability/judgeAdapter");
            const rawTraces = (global as any).currentTraces || [];
            const judgePayload = JudgeAdapter.compress(activeSessionId, rawTraces);

            const data = new StreamData();
            data.append({
                activeMemories: activeContextTags,
                traceReport: null,
                intelligenceTrace: intelligence?.traces || null,
                judgeModeTrace: judgePayload
            } as any);
            data.close();

            // We use a minified JSON response for the bypass message to trigger the fallback in ChatWindow
            return new NextResponse(JSON.stringify({
                role: "assistant",
                content: msg,
                activeMemories: activeContextTags,
                traceReport: null,
                intelligenceTrace: intelligence?.traces || null,
                judgeModeTrace: judgePayload
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
            activeMemories: activeContextTags,
            traceReport: traceReport || null,
            intelligenceTrace: intelligence?.traces || null,
            judgeModeTrace: judgePayload
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

        const openaiClient = new OpenAI();
        const completion = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: finalHumanizerPrompt },
                { role: "user", content: "Provide the response." }
            ],
            stream: true,
        });

        const stream = OpenAIStream(completion, {
            onCompletion: async (text) => {
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
                    traceId: traceReport?.trace_id,
                    traceReport: traceReport || null,
                    intelligenceTrace: judgePayload || null
                });

                if (detectedTone && detectedTone !== "neutral") {
                    await updateUserTone(userId, detectedTone);
                }

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
