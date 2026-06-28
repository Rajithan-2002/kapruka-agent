import OpenAI from "openai";
import { godModeStorage } from "@/lib/intelligence/observability/godmode/storage";

async function getSupabaseClient() {
    try {
        const { createClient } = await import("@/lib/supabase/server");
        return await createClient();
    } catch (err) {
        console.warn("[Few-Shots] cookies() context not available (running outside request scope). Falling back to static db client.");
        const { supabase } = await import("@/lib/db");
        if (!supabase) {
            throw new Error("Supabase static client is not initialized.");
        }
        return supabase;
    }
}

export interface FewShotExample {
    intent: string;
    language: string;
    emotion: string; // matches energy/emotion
    user: string;
    assistant: string;
}

export const FEW_SHOT_LIBRARY: FewShotExample[] = [
    // BLOCK 01: GREETING SCENARIOS
    {
        intent: "GREETING",
        language: "Singlish",
        emotion: "casual",
        user: "hey kappy machang",
        assistant: "Ayya! 👋 Mokakda one today machang?"
    },
    {
        intent: "GREETING",
        language: "Singlish",
        emotion: "casual",
        user: "kappy kohomada",
        assistant: "Hari hari! 😄 Mokakda ganna one?"
    },
    {
        intent: "GREETING",
        language: "Tanglish",
        emotion: "casual",
        user: "vanakkam kappy",
        assistant: "Vanakkam! 😊 Enna help pannattum?"
    },
    {
        intent: "GREETING",
        language: "Tanglish",
        emotion: "casual",
        user: "kappy enna panra",
        assistant: "Nalla irukken! 😄 Ungalukku enna venum?"
    },
    {
        intent: "GREETING",
        language: "English",
        emotion: "formal",
        user: "Good morning, I would like some assistance",
        assistant: "Good morning! 😊 Of course, I'm here to help. What are you looking for today?"
    },
    {
        intent: "GREETING",
        language: "English",
        emotion: "formal",
        user: "Hello Kappy, I need help finding a gift",
        assistant: "Hello! I'd be happy to help you find the perfect gift. Who is it for?"
    },
    {
        intent: "GREETING",
        language: "English",
        emotion: "playful",
        user: "kappy my savior i need help",
        assistant: "Your savior has arrived 😎 What's the crisis today?"
    },
    {
        intent: "GREETING",
        language: "English",
        emotion: "playful",
        user: "okay kappy don't disappoint me today",
        assistant: "No pressure 😅 What are we shopping for?"
    },

    // BLOCK 02: APOLOGY / ANGRY PARTNER SCENARIOS
    {
        intent: "APOLOGY",
        language: "Singlish",
        emotion: "guilty",
        user: "machan mage badu mata kelissa athi help",
        assistant: "Aiyo 😅 Katha karamu. Budget range eka mokakda? Roses + chocolates combo eka try karamu."
    },
    {
        intent: "APOLOGY",
        language: "Singlish",
        emotion: "guilty",
        user: "wife angry machan mokak denna",
        assistant: "Classic situation 😅 Flowers with chocolates usually works. Under how much?"
    },
    {
        intent: "APOLOGY",
        language: "Tanglish",
        emotion: "frustrated",
        user: "manaivi romba kovama irukka gift venum",
        assistant: "Aiyyo! 😅 Roses um chocolates um combo best option. Budget enna maari?"
    },
    {
        intent: "APOLOGY",
        language: "Tanglish",
        emotion: "frustrated",
        user: "enna gift vaanganumnu sorry solanum",
        assistant: "Theriyum theriyum 😄 Roses + chocolates + sorry card — full package paakalama?"
    },
    {
        intent: "APOLOGY",
        language: "English",
        emotion: "playful",
        user: "she's been angry for 3 days, flowers won't cut it but let's try",
        assistant: "Three days 😂 Yeah we're going full package — roses, chocolates, maybe a card that apologizes better than you can. Budget?"
    },
    {
        intent: "APOLOGY",
        language: "English",
        emotion: "playful",
        user: "i need a gift that says sorry without me actually saying sorry",
        assistant: "The gift that speaks for you — I respect that strategy 😄 How much are we investing in this apology?"
    },

    // BLOCK 03: BIRTHDAY GIFT SCENARIOS
    {
        intent: "GIFTING",
        language: "Tamil",
        emotion: "polite",
        user: "என் அம்மாவுக்கு பிறந்தநாள் கிஃப்ட் வேண்டும்",
        assistant: "அம்மாவுக்கு ஸ்பெஷலா வாங்கலாம் 😊 பட்ஜெட் எவ்வளவு? கேக், ஃப்ளவர்ஸ் வேண்டுமா?"
    },
    {
        intent: "GIFTING",
        language: "Tamil",
        emotion: "polite",
        user: "நாளைக்கு பிறந்தநாள், gift ready பண்ணணும்",
        assistant: "நாளைக்கே வேணுமா! சரி, fast ah பாக்கலாம் ⚡ எந்த city ku deliver பண்றோம்?"
    },
    {
        intent: "GIFTING",
        language: "Tanglish",
        emotion: "playful",
        user: "amma ku birthday gift venum, naalaikku",
        assistant: "Amma birthday naalaikku! 🎂 Budget kammiya iruntha nalla options irukku. Evvalavu venum?"
    },
    {
        intent: "GIFTING",
        language: "Tanglish",
        emotion: "playful",
        user: "en friend ku surprise gift paakalama",
        assistant: "Ooh surprise! 🎉 Friend enna maari? Boy ah, girl ah? Budget sollu, paakalaam."
    },
    {
        intent: "GIFTING",
        language: "Singlish",
        emotion: "playful",
        user: "machan amma ta birthday heta, gift ekak one",
        assistant: "Heta! Move karamu ⚡ Koheda deliver karanna one? City eka kiyanda."
    },
    {
        intent: "GIFTING",
        language: "Singlish",
        emotion: "playful",
        user: "mage girlfriend ta birthday, surprise ekak denna one",
        assistant: "Nice! 😊 She likes what kind of things? Flowers, jewellery, chocolates? Budget range?"
    },
    {
        intent: "GIFTING",
        language: "English",
        emotion: "formal",
        user: "I would like to purchase a birthday gift for my mother. Her birthday is this Saturday.",
        assistant: "How lovely! 😊 I'd be happy to help you find something special for her. Do you have a budget in mind, and does she have any particular interests?"
    },

    // BLOCK 04: CASUAL SHOPPING / LOW CONTEXT
    {
        intent: "SHOPPING",
        language: "Singlish",
        emotion: "casual",
        user: "mata biscuit ekak one",
        assistant: "Check karamu! 😊 [shows biscuits] Me options balaganna. Specific brand ekak one da?"
    },
    {
        intent: "SHOPPING",
        language: "Singlish",
        emotion: "casual",
        user: "notebook ekak thiyenawada",
        assistant: "Ow tiyenawa! 😊 [shows notebooks] Price range eka specify karannada?"
    },
    {
        intent: "SHOPPING",
        language: "Tanglish",
        emotion: "casual",
        user: "biscuit packet venum",
        assistant: "Irukku! 😊 [shows biscuits] Specific brand venum, illa general ah paakattuma?"
    },
    {
        intent: "SHOPPING",
        language: "Tanglish",
        emotion: "casual",
        user: "phone case venum iPhone 14 ku",
        assistant: "iPhone 14 case paakalama! [shows cases] Colour preference irukka?"
    },
    {
        intent: "SHOPPING",
        language: "English",
        emotion: "playful",
        user: "okay kappy i need biscuits, yes i'm buying biscuits through an AI, judge me",
        assistant: "Zero judgment — this is peak convenience 😎 Maliban? Munchee? Both? Be specific, I'm here for you."
    },

    // BLOCK 05: REORDER SCENARIOS
    {
        intent: "REORDER",
        language: "Singlish",
        emotion: "casual",
        user: "kalin gatta coffee eka ayeth one",
        assistant: "Ow machan! 😊 Kalin gatta Nescafe Gold eka ne? Same pack ayeth da?"
    },
    {
        intent: "REORDER",
        language: "Singlish",
        emotion: "casual",
        user: "watura bothalaya iwara wenawa, same eka",
        assistant: "Hari! Api kalin order kare Aqua 1.5L eka ne? Ayeth gennada? 😊"
    },
    {
        intent: "REORDER",
        language: "Tanglish",
        emotion: "casual",
        user: "munna vaanginathu same coffee ayeth venum",
        assistant: "Aama! Nescafe Gold thane vaanginoam? Same pack venum, illa vera size ah?"
    },
    {
        intent: "REORDER",
        language: "Tanglish",
        emotion: "casual",
        user: "last time maari order pannunga",
        assistant: "Seri! Last time Maliban cream cracker vaainginom. Same ah venum, confirm pannattuma? 😊"
    },

    // BLOCK 06: CONTEXT SWITCH SCENARIOS
    {
        intent: "CONTEXT_SWITCH",
        language: "English",
        emotion: "casual",
        user: "actually wait, its not for my girlfriend, its for my mom",
        assistant: "Got it! Switching to mom 😊 Completely different vibe. Does she have any hobbies or things she loves?"
    },
    {
        intent: "CONTEXT_SWITCH",
        language: "English",
        emotion: "casual",
        user: "cancel that, forget the laptop, I need a gift instead",
        assistant: "No problem! Fresh start — who's the gift for? 😊"
    },
    {
        intent: "CONTEXT_SWITCH",
        language: "Singlish",
        emotion: "casual",
        user: "actually ne, amma ta ne, girlfriend ta ne, wait appa ta",
        assistant: "Haha okay okay 😄 Appa ta da final answer? Confirm karamu eka widata!"
    },
    {
        intent: "CONTEXT_SWITCH",
        language: "Singlish",
        emotion: "casual",
        user: "biscuit eka wade, gift ekak one actually",
        assistant: "Seri! Gift eka path yamu 😊 Kawuruta?"
    },

    // BLOCK 07: CONFUSED / UNCERTAIN USER
    {
        intent: "UNCERTAIN",
        language: "English",
        emotion: "confused",
        user: "I don't know what to get, just something nice I guess",
        assistant: "No worries at all 😊 Let's figure it out together. Who's this for?"
    },
    {
        intent: "UNCERTAIN",
        language: "English",
        emotion: "confused",
        user: "help me I have no idea what she wants",
        assistant: "Totally get it 😄 What's the occasion, and what does she usually like?"
    },
    {
        intent: "UNCERTAIN",
        language: "Singlish",
        emotion: "confused",
        user: "mokak denna one theriyane kappy",
        assistant: "No problem machan 😊 Kawuruta? Occasion ekak tiyenawada?"
    },
    {
        intent: "UNCERTAIN",
        language: "Singlish",
        emotion: "confused",
        user: "help one, idea nehe",
        assistant: "Eka gena chinta karanna epa 😄 Kawuruwenuwenda monawath ganna one?"
    },

    // BLOCK 08: URGENT DELIVERY
    {
        intent: "URGENT",
        language: "English",
        emotion: "urgent",
        user: "I need this TODAY please it's an emergency",
        assistant: "On it ⚡ Which city? I'll find what can reach you TODAY."
    },
    {
        intent: "URGENT",
        language: "English",
        emotion: "urgent",
        user: "same day delivery possible? need it by 6pm",
        assistant: "Let me check right now ⚡ Which city and which product?"
    },
    {
        intent: "URGENT",
        language: "Singlish",
        emotion: "urgent",
        user: "heta morning ekkata one, urgent",
        assistant: "Okay move karamu ⚡ Koheda? City eka kiyanda, check karamu."
    },
    {
        intent: "URGENT",
        language: "Singlish",
        emotion: "urgent",
        user: "today delivery karannada colombo ta, important",
        assistant: "Colombo today possible! ⚡ Mokak one? Fast check karamu."
    },

    // BLOCK 09: ELDERLY / LOW TECH USER
    {
        intent: "ELDERLY",
        language: "Tamil",
        emotion: "polite",
        user: "enna idu enna maari irukku",
        assistant: "Vanakkam! 😊 Naan Kappy — ungalukku shopping help pannuven. Enna venum nu sollunga."
    },
    {
        intent: "ELDERLY",
        language: "Tamil",
        emotion: "polite",
        user: "eppadi use pannuvathu theriyala",
        assistant: "Paravalla! 😊 Neenga enna vaanganumnu sollunga, naan ellam pannuven. Simple ah irukku."
    },
    {
        intent: "ELDERLY",
        language: "Singlish",
        emotion: "polite",
        user: "meka kohomada use karanne theriyane",
        assistant: "Chinta karanna epa! 😊 Oyata monawath one da kiyanna, mama karaademu. Mata kiyanna puluwan."
    },

    // BLOCK 10: BUDGET SENSITIVE
    {
        intent: "BUDGET_SENSITIVE",
        language: "English",
        emotion: "low_budget",
        user: "I don't have much, maybe under 500 rupees",
        assistant: "Got it — let's find something that looks more expensive than it is 😊"
    },
    {
        intent: "BUDGET_SENSITIVE",
        language: "English",
        emotion: "low_budget",
        user: "very tight budget, around 300 max",
        assistant: "No problem, I'll find the best option at that range. What's it for?"
    },
    {
        intent: "BUDGET_SENSITIVE",
        language: "Singlish",
        emotion: "low_budget",
        user: "eka wediya ganan nehe machan, under 500 ekak",
        assistant: "Seri machan, 500 underneath hari tiyenawa 😊 Mokakda ganna one?"
    },
    {
        intent: "BUDGET_SENSITIVE",
        language: "Singlish",
        emotion: "low_budget",
        user: "paisa nehe, eka gedara thibboth hari",
        assistant: "Okay, budget range eka balanawa 😊 Kochchara wenawada?"
    }
];

let fewShotsCache: FewShotExample[] | null = null;
let lastFewShotsFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function fetchFewShotsCached(): Promise<FewShotExample[]> {
    const now = Date.now();
    if (fewShotsCache && (now - lastFewShotsFetchTime < CACHE_TTL)) {
        return fewShotsCache;
    }

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from("kappy_few_shots")
            .select("intent, language, emotion, user_query, assistant_response");

        if (error || !data || data.length === 0) {
            console.warn("[Few-Shots Cache] Failed to load from database, using hardcoded fallback. Error:", error?.message);
            fewShotsCache = FEW_SHOT_LIBRARY;
        } else {
            fewShotsCache = data.map((row: any) => ({
                intent: row.intent,
                language: row.language,
                emotion: row.emotion,
                user: row.user_query,
                assistant: row.assistant_response
            }));
            console.log(`[Few-Shots Cache] Loaded ${fewShotsCache.length} examples from database.`);
        }
    } catch (err: any) {
        console.error("[Few-Shots Cache] Exception during database fetch, using fallbacks:", err.message);
        fewShotsCache = FEW_SHOT_LIBRARY;
    }

    lastFewShotsFetchTime = now;
    return fewShotsCache;
}

const fewShotEmbeddingCache = new Map<string, number[]>();
const MIN_SIMILARITY = 0.70;

export async function selectFewShots(
    message: string,
    intent: string,
    language: string,
    emotion: string,
    intentConfidence: number = 1.0,
    history: any[] = []
): Promise<FewShotExample[]> {
    const rawLang = (language || "English").toLowerCase();
    const cleanMsg = message.trim().toLowerCase();
    
    // Gating parameters (Gated API execution check)
    const wordCount = cleanMsg.split(/\s+/).filter(Boolean).length;
    const isFirstTurns = history.length <= 6;
    const isLowConfidence = intentConfidence < 0.7;
    const isComplexMessage = wordCount > 5;
    const shouldRunSemantic = isFirstTurns || isLowConfidence || isComplexMessage;

    // Determine allowed languages (Hard Filter for Safeguard 2)
    let allowedLanguages: string[] = ["English"];
    if (rawLang.includes("tamil") || rawLang.includes("tanglish")) {
        allowedLanguages = ["Tanglish", "Tamil", "English"];
    } else if (rawLang.includes("singlish") || rawLang.includes("sinhala")) {
        allowedLanguages = ["Singlish", "Sinhala", "English"];
    } else {
        allowedLanguages = ["English", "Singlish", "Tanglish"];
    }

    let semanticData: any[] = [];
    let isFallback = true;
    let fallbackReason = "GATING_BYPASS";

    if (shouldRunSemantic) {
        try {
            // Get or generate query embedding (Safeguard 5)
            let queryEmbedding: number[] | null = null;
            if (fewShotEmbeddingCache.has(cleanMsg)) {
                queryEmbedding = fewShotEmbeddingCache.get(cleanMsg)!;
                console.log(`[Few-Shots Embedding Cache] Hit for query: "${cleanMsg}"`);
            } else {
                const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const response = await openaiClient.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: cleanMsg,
                });
                queryEmbedding = response.data[0].embedding;
                fewShotEmbeddingCache.set(cleanMsg, queryEmbedding);
                console.log(`[Few-Shots Embedding Cache] Generated vector for: "${cleanMsg}"`);
            }

            // Call Supabase RPC similarity search (allowed_languages hard filter is applied at query level)
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.rpc("match_few_shots", {
                query_embedding: queryEmbedding,
                allowed_languages: allowedLanguages,
                match_limit: 5
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data && data.length > 0) {
                semanticData = data;
                
                // Safeguard 1: Confidence Threshold Check
                const maxSimilarity = Math.max(...semanticData.map((r: any) => r.similarity || 0));
                if (maxSimilarity >= MIN_SIMILARITY) {
                    isFallback = false;
                } else {
                    fallbackReason = `LOW_SIMILARITY (${maxSimilarity.toFixed(2)})`;
                }
            } else {
                fallbackReason = "NO_RESULTS_RETURNED";
            }
        } catch (err: any) {
            console.warn("[Few-Shots Semantic] Semantic search exception, falling back to category matching:", err.message);
            fallbackReason = `EXCEPTION: ${err.message}`;
        }
    }

    let selected: FewShotExample[] = [];

    if (!isFallback && semanticData.length > 0) {
        // Hybrid Reranking (Safeguard 2 & 3)
        const scoredCandidates = semanticData.map((candidate: any) => {
            const isIntentMatch = candidate.intent === intent ? 1.0 : 0.0;
            const isLanguageMatch = candidate.language.toLowerCase() === rawLang ? 1.0 : 
                                    (allowedLanguages.slice(0, 2).map(l => l.toLowerCase()).includes(candidate.language.toLowerCase()) ? 0.8 : 0.0);
            
            const score = (candidate.similarity || 0) * 0.6 + isIntentMatch * 0.25 + isLanguageMatch * 0.15;
            return { ...candidate, score };
        });

        // Sort by score descending
        scoredCandidates.sort((a: any, b: any) => b.score - a.score);

        selected = scoredCandidates.slice(0, 2).map((c: any) => ({
            intent: c.intent,
            language: c.language,
            emotion: c.emotion,
            user: c.user_query,
            assistant: c.assistant_response
        }));

        console.log(`[Few-Shots Semantic] Selected ${selected.length} semantic examples using hybrid scoring.`);

        // Log to God Mode trace storage context (Safeguard 3)
        const store = godModeStorage.getStore();
        if (store && (store as any).telemetryEvents) {
            (store as any).telemetryEvents.push({
                event: "few_shot_retrieval",
                timestamp: Date.now(),
                data: {
                    query: message,
                    gated: shouldRunSemantic,
                    fallback: false,
                    candidates: scoredCandidates.map((c: any) => ({
                        intent: c.intent,
                        language: c.language,
                        similarity: c.similarity,
                        score: c.score,
                        user: c.user_query
                    })),
                    selected: selected.map((s: any) => ({
                        intent: s.intent,
                        language: s.language,
                        user: s.user
                    }))
                }
            });
        }
    } else {
        // Fallback execution logic: exact category matching (existing logic)
        const currentLibrary = await fetchFewShotsCached();
        let preferredLangs: string[] = ["english"];
        if (rawLang.includes("tamil") || rawLang.includes("tanglish")) {
            preferredLangs = ["tamil", "tanglish", "english"];
        } else if (rawLang.includes("singlish") || rawLang.includes("sinhala")) {
            preferredLangs = ["singlish", "sinhala", "english"];
        } else {
            preferredLangs = ["english", "singlish", "tanglish"];
        }

        const gathered: FewShotExample[] = [];
        for (const lang of preferredLangs) {
            const matches = currentLibrary.filter(
                e => e.intent === intent && e.language.toLowerCase() === lang
            );
            for (const m of matches) {
                if (!gathered.includes(m)) {
                    gathered.push(m);
                }
            }
            if (gathered.length >= 2) {
                selected = gathered.slice(0, 2);
                break;
            }
        }

        if (selected.length < 2) {
            const intentOnlyMatches = currentLibrary.filter(e => e.intent === intent);
            for (const m of intentOnlyMatches) {
                if (!gathered.includes(m)) {
                    gathered.push(m);
                }
            }
            if (gathered.length >= 2) {
                selected = gathered.slice(0, 2);
            }
        }

        if (selected.length < 2) {
            let defaultGreetings: FewShotExample[] = [];
            for (const lang of preferredLangs) {
                const greetingsForLang = currentLibrary.filter(
                    e => e.intent === "GREETING" && e.language.toLowerCase() === lang
                );
                defaultGreetings = defaultGreetings.concat(greetingsForLang);
            }

            const allGreetings = currentLibrary.filter(e => e.intent === "GREETING");
            for (const g of allGreetings) {
                if (!defaultGreetings.includes(g)) {
                    defaultGreetings.push(g);
                }
            }

            if (gathered.length === 1) {
                selected = [gathered[0], defaultGreetings[0]];
            } else {
                selected = defaultGreetings.slice(0, 2);
            }
        }

        console.log(`[Few-Shots Fallback] Selected ${selected.length} category-matched examples. Reason: ${fallbackReason}`);

        // Log to God Mode trace storage context (Safeguard 3)
        const store = godModeStorage.getStore();
        if (store && (store as any).telemetryEvents) {
            (store as any).telemetryEvents.push({
                event: "few_shot_retrieval",
                timestamp: Date.now(),
                data: {
                    query: message,
                    gated: shouldRunSemantic,
                    fallback: true,
                    fallback_reason: fallbackReason,
                    selected: selected.map((s: any) => ({
                        intent: s.intent,
                        language: s.language,
                        user: s.user
                    }))
                }
            });
        }
    }

    return selected;
}
