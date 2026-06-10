import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/services/profileService";
import { getRelationships, getPreferences, getMemories, addMemory, addPreference, addRelationship } from "@/lib/services/memoryService";
import { buildUserContext } from "@/lib/services/personalizationService";
import { saveChatMessage, getRecentChatHistory, updateUserTone, getUserTone } from "@/lib/services/chatHistoryService";
import { recordInteraction, getBehaviorProfile } from "@/lib/services/behaviorProfileService";
import { getPurchaseHistory } from "@/lib/services/purchaseHistoryService";
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
import { translateSearchQuery } from "@/lib/translation";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { KAPPY_PERSONA_INSTRUCTION } from "@/lib/masterPrompt";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.id;

        const { message, history, sessionId } = await request.json();
        const activeSessionId = sessionId || `session-${Date.now()}`;

        // Record interaction for progressive relationship building
        await recordInteraction(userId);

        // 1. Retrieve Memories from Database using new services
        const profile = await getProfile(userId);
        const relationships = await getRelationships(userId);
        const preferences = await getPreferences(userId);
        const memories = await getMemories(userId);
        const userContextBlock = await buildUserContext(userId);
        const userTone = await getUserTone(userId);
        const behaviorProfile = await getBehaviorProfile(userId);
        const purchases = await getPurchaseHistory(userId, 10);

        // Load past conversation history from DB for reorder/context recall
        const pastChats = await getRecentChatHistory(userId, 30);
        const pastChatsContext = pastChats.length > 0
            ? pastChats.slice(0, 15).reverse().map(c => `${c.role === "user" ? "User" : "Kappy"}: ${c.content}`).join("\n")
            : "";

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

        // 2. ORCHESTRATOR PHASE (JSON intent classifier)
        const orchestratorPrompt = `
You are the AI Orchestrator manager for Kappy, a shopping assistant for Kapruka (Sri Lanka).
Analyze the user's current message, the chat history, and the active memory database:

[ACTIVE USER CONTEXT]
${userContextBlock}

[PAST CONVERSATION HISTORY (from database)]
${pastChatsContext || "No past conversations yet — this is a new user."}

[CURRENT SESSION HISTORY]
${chatHistoryContext}

[USER'S CURRENT REQUEST]
"${message}"

[USER'S KNOWN COMMUNICATION STYLE]
Detected tone: ${userTone.tone} (confidence: ${userTone.confidence.toFixed(2)})

Determine what action to take. You must respond ONLY with a raw JSON object in this format:
{
  "is_shopping_request": boolean,
  "shopping_request_confidence": number,
  "intent": "gift_shopping" | "order_tracking" | "reorder" | "delivery_check" | "general_chat" | "checkout" | "session_recovery" | "browsing_categories" | "product_details" | "unsupported",
  "unsupported_domain": "programming" | "mathematics" | "academic" | "general_knowledge" | "creative_writing" | "coding_help" | "career_advice" | null,
  "detected_recipient": "mother" | "girlfriend" | "wife" | "father" | "friend" | "boss" | "child" | "colleague" | null,
  "detected_occasion": "birthday" | "anniversary" | "apology" | "celebration" | "new_baby" | "seasonal" | "housewarming" | "get_well" | "sympathy" | "just_because" | null,
  "detected_budget": number | null,
  "detected_emotion": "urgent" | "guilty" | "excited" | "uncertain" | "sympathetic" | "financially_sensitive" | "neutral",
  "detected_intent": "find_product" | "tracking_status" | "general_chat" | "checkout_request" | "customer_service_escalation" | "list_categories" | "list_cities" | "get_product_details",
  "detected_tone": "formal" | "polite" | "casual_english" | "singlish_casual" | "tanglish_casual" | "sinhala" | "tamil" | "neutral",
  "delivery_city": string | null,
  "delivery_date": string | null,
  "is_bundle_requested": boolean,
  "is_reorder": boolean,
  "proactive_bundle_suggest": boolean,
  "gift_message_needed": boolean,
  "gift_message_tone": "heartfelt" | "funny" | "simple" | null,
  "recommendation_mode": "discovery" | "recommendation" | null,
  "is_task_cancelled": boolean,
  "is_context_override": boolean,
  "mcp_tool_needed": "kapruka_search_products" | "kapruka_track_order" | "kapruka_check_delivery" | "kapruka_get_product" | "kapruka_list_categories" | "kapruka_list_delivery_cities" | "show_more" | null,
  "mcp_search_query": string | null,
  "shopping_stage": string | null,
  "pending_stages": string[] | null,
  "extracted_memory": {
     "category": "preference" | "relationship" | "behavior" | null,
     "relationship": "mother" | "girlfriend" | "wife" | "father" | "friend" | "boss" | "child" | null,
     "interest": string | null,
     "behavioral_trait": string | null,
     "notes": string | null
  } | null
}

RULES:
1. If user reveals preference/behavior, capture under "preference" or "behavior" category.
2. If asking for a gift recommendation, set "intent" to "gift_shopping" and decompose query into "shopping_stage".
3. TOOL SELECTION RULES (from Master Prompt Section 5):
   - kapruka_search_products: Only when you have enough context (occasion+recipient+budget OR explicit product name+budget).
   - kapruka_get_product: User asks for more details about a specific product ("tell me more about this one").
   - kapruka_list_categories: User is browsing with no specific product ("What kinds of things can you help me buy?").
   - kapruka_list_delivery_cities: User asks which cities Kapruka delivers to ("Do you deliver to the North?").
   - kapruka_check_delivery: A product has been identified AND a delivery city has been mentioned.
   - kapruka_track_order: User asks about order status ("Where is my order?").
   - show_more: User asks for "show more", "next page", "more products", "browse more" for the CURRENT search context. Do NOT use search products for pagination.
4. Detect EMOTIONS strictly based on Master Prompt Section 3: "urgent", "guilty", "excited", "uncertain", "sympathetic", "financially_sensitive".
5. Detect TONE carefully to assign language modes.
6. Set "is_task_cancelled" to true if the user says "never mind", "forget it", "cancel that", or changes their mind about the current active task.
7. Set "recommendation_mode": 
   - "discovery": if user wants to browse, show all, or list available products (e.g., "Show all cakes").
   - "recommendation": if user explicitly asks for suggestions, top picks, or "what should I buy?".
   - null: if not relevant.
8. DOMAIN GUARDRAIL RULES:
   - You MUST set "is_shopping_request" to true ONLY if the user is asking about Product Discovery, Shopping Conversations, Delivery, Orders, Shopping Planning, Relationship-Based Shopping, or Reordering. 
   - You MUST set "is_shopping_request" to false if the request falls under: Programming, Mathematics, Academic Questions, General Knowledge, Creative Writing, Coding Help, or Career Advice.
   - Small talk ("Hi", "How are you?") IS allowed (set is_shopping_request: true, intent: "general_chat").
9. CONTEXT OVERRIDE RULE:
   - If the user explicitly changes a shopping constraint (e.g., "My budget is 9000 now", "Forget the cake", "Actually for my mother"), you MUST set "is_context_override": true.
   - When "is_context_override" is true, you MUST also set "mcp_tool_needed": "kapruka_search_products" so that the old cache is invalidated and a fresh search happens with the new parameters.
10. MCP SEARCH QUERY FORMULATION:
   - When setting "kapruka_search_products", your "mcp_search_query" MUST contain descriptive product keywords (e.g., "girlfriend anniversary gift", "chocolate cake").
   - NEVER put the budget or price constraints in the search query (e.g., NEVER use "under 9000", "cheap", "gifts under 5000"). Budget filtering is handled separately.
   - For a context override, re-use the previous search concepts (e.g., "girlfriend gift") in the query text.
`;

        const orchestratorRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: orchestratorPrompt }],
            response_format: { type: "json_object" }
        });

        const plan = JSON.parse(orchestratorRes.choices[0].message.content || "{}");
        console.log("Kappy Orchestrator Plan:", plan);

        // 3. Save memory to database if extracted
        if (plan.extracted_memory) {
            const ext = plan.extracted_memory;
            let relId = "";

            if (ext.relationship) {
                let existingRel = relationships.find(
                    r => r.relationship_type.toLowerCase() === ext.relationship.toLowerCase()
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

        // 4. Update Profile Budget if detected
        let previousBudget = profile?.average_budget || null;
        if (plan.detected_budget) {
            await updateProfile(userId, { average_budget: plan.detected_budget });
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

        // Update shopping journey stages if shopping stage is detected
        const journey = await getOrCreateJourney(userId, activeSessionId, plan.detected_occasion, plan.detected_recipient);
        if (plan.shopping_stage) {
            const stages = [...(journey.stages || [])];
            if (!stages.some(s => s.stage === plan.shopping_stage)) {
                stages.push({ stage: plan.shopping_stage, status: 'pending' });
            }
            if (plan.pending_stages && Array.isArray(plan.pending_stages)) {
                for (const pStage of plan.pending_stages) {
                    if (!stages.some(s => s.stage === pStage)) {
                        stages.push({ stage: pStage, status: 'pending' });
                    }
                }
            }
            await updateJourneyStages(userId, activeSessionId, stages);
        }

        // 5. EXECUTE MCP TOOL OR RUN LOGIC
        let toolResults: unknown = null;
        let productsList: unknown[] = [];
        let trackingData: Record<string, unknown> | null = null;
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

        if (!plan.is_shopping_request) {
            // DOMAIN GUARDRAIL TRIGGERED
            toolResults = {
                guardrail_triggered: true,
                message: `Sorry! 😊 I'm Kappy, a shopping assistant for Kapruka.\n\nI can help you with:\n• Finding products\n• Gift recommendations\n• Delivery information\n• Orders and tracking\n• Reordering purchases\n\nI can't assist with programming, academic questions, or general knowledge topics.\n\nWhat would you like to shop for today?`
            };
        } else if (plan.is_task_cancelled) {
            toolExecutionTrace.status = "cancelled";
            toolResults = { status: "cancelled", message: "User cancelled the task." };
        } else if (plan.detected_intent === "customer_service_escalation") {
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
        } else if (plan.mcp_tool_needed === "show_more" || (plan.mcp_tool_needed === "kapruka_search_products" && plan.mcp_search_query)) {
            const mode = plan.recommendation_mode || "recommendation";
            let finalRankedList: any[] = [];
            let cacheRemaining = 0;
            let rawProductCount = 0;
            let filteredCount = 0;
            let deduplicatedCount = 0;
            let traceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
            let logs: any[] = [];

            if (plan.mcp_tool_needed === "show_more") {
                // FETCH FROM CACHE
                const session = await getSearchSession(activeSessionId);
                if (session && session.remaining_count > 0) {
                    finalRankedList = session.products;
                    cacheRemaining = session.remaining_count;
                    rawProductCount = session.total_products;
                } else {
                    // Fallback to searching again if cache is empty or expired
                    plan.mcp_tool_needed = "kapruka_search_products";
                }
            }
            
            if (plan.mcp_tool_needed === "kapruka_search_products") {
                const translatedQuery = await translateSearchQuery(plan.mcp_search_query || "");
                const rawProducts = await mcpSearchProducts(translatedQuery, 40);
                rawProductCount = rawProducts.length;
                
                // Map to standardized format
                const mappedProducts = rawProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price.amount,
                    url: p.url,
                    category: p.category?.name,
                    description: p.summary,
                    imageUrl: p.image_url,
                    in_stock: p.in_stock
                }));

                // 1. Deduplication First
                const dedupedProducts = deduplicateProducts(mappedProducts, "Kapruka Search Recommendations");
                deduplicatedCount = rawProducts.length - dedupedProducts.length;
                
                // 2. Strict Filter Engine
                const validationResult = validateProducts(
                    dedupedProducts as any[],
                    {
                        userIntent: plan.shopping_stage || plan.mcp_search_query || "",
                        currentShoppingStage: plan.shopping_stage || "",
                        occasion: plan.detected_occasion || undefined,
                        recipient: plan.detected_recipient || undefined,
                        budget: plan.detected_budget || undefined,
                        searchQuery: plan.mcp_search_query || ""
                    },
                    logs
                );
                
                filteredCount = validationResult.rejected.length;
                logs = validationResult.logs;
                
                // 3. Scoring Engine
                const dedupedIds = new Set(validationResult.approved.map((p: any) => p.id));
                const approvedMcpProducts: any[] = [];
                const seenIdsForScoring = new Set<string>();
                for (const p of rawProducts) {
                    if (dedupedIds.has(p.id) && !seenIdsForScoring.has(p.id)) {
                        approvedMcpProducts.push(p);
                        seenIdsForScoring.add(p.id);
                    }
                }
                let recipientPrefs: string[] = [];
                if (plan.detected_recipient) {
                    const targetRel = relationships.find(
                        (r: any) => r.relationship_type.toLowerCase() === plan.detected_recipient?.toLowerCase()
                    );
                    if (targetRel) {
                        const dbPrefs = preferences.filter((p: any) => p.relationship_id === targetRel.id);
                        recipientPrefs = dbPrefs.map((p: any) => p.interest);
                    }
                }

                const purchaseCategories = purchases.map((p: any) => p.product_category);

                const scoringContext = {
                    situation: plan.detected_occasion || "birthday",
                    recipient: plan.detected_recipient || "mother",
                    recipientPreferences: recipientPrefs,
                    targetBudget: plan.detected_budget || profile?.average_budget || 6000,
                    userIntent: plan.shopping_stage || plan.mcp_search_query || "",
                    purchaseCategories
                };

                const rankingResult = rankProducts(approvedMcpProducts, scoringContext, logs);
                logs = rankingResult.logs;
                finalRankedList = rankingResult.ranked;
            }
            
            // Slice the top 8
            const displayLimit = 8;
            productsList = finalRankedList.slice(0, displayLimit);
            const remainingProducts = finalRankedList.slice(displayLimit);
            cacheRemaining = remainingProducts.length;
            
            // Highlight Top 3
            productsList.forEach((prod: any, idx) => {
                if (idx < 3) {
                    prod.isHighlighted = true;
                }
                const logEntry = logs.find(l => l.productId === prod.id);
                if (logEntry) {
                    logEntry.isDisplayed = true;
                    logEntry.isHighlighted = prod.isHighlighted;
                }
            });
            
            // Save to Session Cache
            if (plan.mcp_tool_needed === "kapruka_search_products" || remainingProducts.length < finalRankedList.length) {
                await saveSearchSession({
                    chat_session_id: activeSessionId,
                    user_id: userId,
                    query: plan.mcp_search_query || "show_more",
                    total_products: finalRankedList.length,
                    displayed_count: productsList.length,
                    remaining_count: remainingProducts.length,
                    products: remainingProducts
                });
            }

            traceReport = {
                trace_id: traceId,
                user_id: userId,
                query: message,
                mode,
                raw_product_count: rawProductCount,
                deduplicated_count: deduplicatedCount,
                filtered_count: filteredCount,
                ranked_count: finalRankedList.length,
                displayed_count: productsList.length,
                cache_remaining: cacheRemaining,
                trace_data: logs,
                context_override: plan.is_context_override || false,
                previous_budget: previousBudget,
                current_budget: plan.detected_budget || profile?.average_budget
            };

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
                trace_data: JSON.stringify(traceReport.trace_data)
            }).then((res: any) => {
                 if (res.error) console.error("Trace logging failed:", res.error);
            });
            
            if (productsList.length === 0 && rawProductCount > 0 && plan.mcp_tool_needed !== "show_more") {
                toolExecutionTrace.status = "completed";
                toolResults = {
                    status: "completed",
                    data: {
                        error: "all_products_filtered",
                        message: "I found products, but they were filtered out because they didn't match the user constraints. Let the user know honestly."
                    }
                };
            } else if (productsList.length === 0) {
                toolExecutionTrace.status = "failed";
                toolExecutionTrace.error_details = "Search returned 0 results.";
                toolResults = { status: "failed", error: "Search returned 0 results." };
            } else {
                toolExecutionTrace.status = "completed";
                toolResults = { status: "completed", data: productsList };
            }

            if (plan.is_bundle_requested) {
                bundleOptions = generateBundleOptions(productsList as any[], plan.detected_occasion, plan.detected_recipient);
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
            giftMessageOptions = craftGiftMessageOptions(plan.detected_occasion, plan.gift_message_tone);
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
        const interactionCount = pastChats.length + (history ? history.length : 0);
        
        const msgLower = message.toLowerCase();
        let detectedTone = plan.detected_tone || "neutral";
        
        const singlishKeywords = ["machan", "ado", "hari", "eka", "mama", "mata", "aiyo", "ane", "patta", "ela"];
        const tanglishKeywords = ["macha", "da", "thala", "evlo", "romba", "nanba", "sari", "illa", "enna"];
        
        // Exact word match to detect user's current slang usage
        const words = msgLower.split(/\s+/);
        if (words.some((w: string) => singlishKeywords.includes(w))) {
            detectedTone = "singlish_casual";
        } else if (words.some((w: string) => tanglishKeywords.includes(w))) {
            detectedTone = "tanglish_casual";
        }

        // Generate a strict recipient-filtered context block to prevent memory bleed
        const filteredUserContextBlock = await buildUserContext(userId, plan.detected_recipient);
        
        // Relationship-Strength Scoring
        const effectiveToneInstruction = `[RELATIONSHIP STRENGTH: ${interactionCount < 3 ? 'LOW' : (userTone.confidence < 0.6 ? 'MEDIUM' : 'HIGH')} (Interactions: ${interactionCount})]
CRITICAL TONE RULES:
- If LOW: START WITH A NEUTRAL, POLITE, AND PROFESSIONAL TONE. DO NOT use slang ("machan", "ado", "bro"). DO NOT use excessive emojis. You must earn familiarity. Example: "Hello! How can I help you today?"
- If MEDIUM: You may use casual English and natural emojis. No heavy Sri Lankan slang yet.
- If HIGH: You have earned familiarity. Mirror their exact style ("${userTone.tone}"). You may use "machan" or "ado" IF it matches their style.`;

        const finalHumanizerPrompt = `
${KAPPY_PERSONA_INSTRUCTION}

[USER BEHAVIORAL PROFILE & STAGE]
- Personality stage: ${behaviorProfile.personality_stage}
- Relationship strength: ${behaviorProfile.relationship_strength.toFixed(2)}
- Favorite categories: ${behaviorProfile.favorite_categories.join(", ") || "None yet"}
- Standard budget range: Min: ${behaviorProfile.favorite_price_range.min} LKR, Max: ${behaviorProfile.favorite_price_range.max} LKR

[ACTIVE SHOPPING JOURNEY]
- Occasion: ${journey.occasion || "None specified"}
- Recipient: ${journey.recipient || "None specified"}
- Completed/Pending Stages: ${JSON.stringify(journey.stages)}

[ACTIVE USER CONTEXT (Filtered for ${plan.detected_recipient || 'General'})]
${filteredUserContextBlock}

[ADAPTIVE COMMUNICATION STYLE — CRITICAL]
${effectiveToneInstruction}

[PAST CONVERSATION CONTEXT]
${pastChatsContext ? `The user has chatted before. Here are their recent past messages for context:
${pastChatsContext}` : "This appears to be a new user with no past conversation history."}

[CURRENT SESSION HISTORY]
${chatHistoryContext}

[USER'S CURRENT REQUEST]
"${message}"

[ORCHESTRATION CONTEXT]
- Intent Detected: ${plan.intent}
- Recipient: ${plan.detected_recipient || "N/A"}
- Occasion: ${plan.detected_occasion || "N/A"}
- Target Budget: ${plan.detected_budget || profile.average_budget} LKR
- Emotion Detected: ${plan.detected_emotion || "neutral"}
- Delivery City/Date: ${plan.delivery_city || "N/A"} / ${plan.delivery_date || "N/A"}
- Tool Results: ${JSON.stringify(toolResults)}

[FINAL EXECUTION RULES]
Based on the Master System Prompt rules and the above context, generate Kapri's response.
1. ALWAYS prioritize matching the EMOTIONAL state detected: ${plan.detected_emotion || "neutral"}.
2. Check the "WHERE ARE WE IN THE JOURNEY?" rule (Section 1.6) and take ONLY ONE action.
3. If products are shown, designate ONE as Kapri's Pick with a human reason.
4. DO NOT list products, prices, or images in your text. The UI automatically renders them below your message. Just refer to them naturally.
5. EXPLICIT TOOL STATUS RULES:
   - If Tool Results status is "failed", DO NOT say "Let me check" or "Hang tight". Acknowledge the failure honestly ("I couldn't retrieve that information right now. Want me to try again?").
   - If Tool Results status is "cancelled", acknowledge the cancellation naturally ("No problem at all! What else can I help with?").
`;

        let finalResponseText = "";
        
        if (toolResults && (toolResults as any).guardrail_triggered) {
            finalResponseText = (toolResults as any).message;
        } else {
            const humanRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: finalHumanizerPrompt }]
            });
            finalResponseText = humanRes.choices[0].message.content || "I'm having a little trouble thinking right now. Could you ask me again? 😊";
        }

        // Retrieve active context tags from database
        const updatedPrefs = await getPreferences(userId);
        const updatedRels = await getRelationships(userId);
        const activeContextTags = updatedPrefs.slice(0, 3).map(p => {
            const rel = updatedRels.find(r => r.id === p.relationship_id);
            return rel ? `${rel.nickname} ${p.interest}` : p.interest;
        });

        // Save Kappy's response to persistent chat history
        await saveChatMessage(userId, activeSessionId, "assistant", finalResponseText, {
            intent: plan.intent,
            detected_tone: detectedTone,
            products_shown: productsList.length,
            products_list: productsList,
            tracking_data: trackingData,
            bundleOptions: bundleOptions,
            giftMessages: giftMessageOptions,
            traceId: traceReport?.trace_id
        });

        // Update the user's communication tone profile (progressive learning)
        if (detectedTone && detectedTone !== "neutral") {
            await updateUserTone(userId, detectedTone);
        }

        // 7. RETURN FINAL PAYLOAD TO FRONTEND

        return NextResponse.json({
            role: "assistant",
            content: finalResponseText,
            products: productsList.length > 0 ? productsList : undefined,
            tracking: trackingData ? trackingData : undefined,
            activeMemories: activeContextTags,
            traceReport: traceReport
        });

    } catch (error: unknown) {
        console.error("Kappy Reasoning Loop Error:", error);

        // Handle OpenAI API rate limit (429) gracefully
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")) {
            return NextResponse.json({
                role: "assistant",
                content: "I'm a bit overloaded right now 😅 Could you try again in just a moment?"
            });
        }

        return NextResponse.json({
            role: "assistant",
            content: "Something went wrong on my end 😕 Let me try that again — could you resend your message?"
        });
    }
}
