import * as fs from "fs";
import * as path from "path";
import { CATEGORY_ALIASES } from "@/lib/intelligence/dictionaries/categoryAliases";

export interface PreIntentResult {
    pre_classified: boolean;
    intent: string | null;
    flags: string[];
    slots: {
        exclusion_target?: string;
        recipient?: string;
        occasion?: string;
        budget?: number;
        [key: string]: any;
    };
    fallback: "LLM" | "NONE";
}

let cachedDictionary: any = null;

function getDictionary(): any {
    if (cachedDictionary) {
        return cachedDictionary;
    }

    const pathsToSearch = [
        path.join(/*turbopackIgnore: true*/ process.cwd(), "datasets", "sri_lankan_normalization_dictionary.json"),
        path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "datasets", "sri_lankan_normalization_dictionary.json"),
        path.join(/*turbopackIgnore: true*/ __dirname, "..", "..", "..", "..", "..", "datasets", "sri_lankan_normalization_dictionary.json"),
        path.join(/*turbopackIgnore: true*/ __dirname, "..", "..", "..", "..", "datasets", "sri_lankan_normalization_dictionary.json")
    ];

    for (const p of pathsToSearch) {
        if (fs.existsSync(p)) {
            try {
                const content = fs.readFileSync(p, "utf8");
                cachedDictionary = JSON.parse(content);
                console.log(`[PreIntentParser] Loaded dictionary from ${p}`);
                return cachedDictionary;
            } catch (err: any) {
                console.error(`[PreIntentParser] Failed to parse dictionary at ${p}:`, err.message);
            }
        }
    }

    console.warn("[PreIntentParser] Normalization dictionary not found. Initializing empty dictionary.");
    cachedDictionary = {
        intent_signals: [],
        relationship_vocabulary: [],
        occasion_vocabulary: [],
        shopping_products: [],
        location_aliases: [],
        budget_terms: [],
        singlish_connectors: [],
        greetings: []
    };
    return cachedDictionary;
}

export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        // Remove common punctuation but keep letters, digits, spaces, and non-ASCII unicode chars
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?@'"]/g, "")
        // Collapse duplicate adjacent English letters: e.g. "ll" -> "l", "ss" -> "s", "aa" -> "a"
        .replace(/([a-zA-Z])\1+/g, "$1")
        .trim();
}

function matchesPhrase(message: string, phrase: string): boolean {
    const normMsg = normalizeText(message);
    const normPhrase = normalizeText(phrase);
    if (!normPhrase) return false;

    const index = normMsg.indexOf(normPhrase);
    if (index === -1) return false;

    // Check start boundary (must not be preceded by letter or number)
    if (index > 0) {
        const prevChar = normMsg[index - 1];
        if (/\p{L}|\p{N}/u.test(prevChar)) {
            return false;
        }
    }

    // Check end boundary (must not be followed by letter or number)
    const endIndex = index + normPhrase.length;
    if (endIndex < normMsg.length) {
        const nextChar = normMsg[endIndex];
        if (/\p{L}|\p{N}/u.test(nextChar)) {
            return false;
        }
    }

    return true;
}

function checkHariContext(lastAssistantMessage: string | null): boolean {
    if (!lastAssistantMessage) return false;
    const msgLower = lastAssistantMessage.toLowerCase();

    const isOrderSummary = msgLower.includes("total") ||
                           msgLower.includes("order") ||
                           msgLower.includes("summary") ||
                           msgLower.includes("rs.") ||
                           msgLower.includes("lkr") ||
                           msgLower.includes("checkout") ||
                           msgLower.includes("confirm");

    const isYesNo = msgLower.includes("?") && (
        msgLower.includes("puluwanda") ||
        msgLower.includes("da") ||
        msgLower.includes("would you like") ||
        msgLower.includes("do you want") ||
        msgLower.includes("is this") ||
        msgLower.includes("kamathi") ||
        msgLower.includes("correct") ||
        msgLower.includes("nehe") ||
        msgLower.includes("ok")
    );

    return isOrderSummary || isYesNo;
}

function checkNoContext(message: string, term: string): boolean {
    const msgLower = message.toLowerCase();
    const words = msgLower.split(/\s+/);
    const index = words.indexOf(term.toLowerCase());
    if (index > 0) {
        const prevWord = words[index - 1];
        const modifiers = ["budget", "stock", "salli", "ganan", "badu", "money", "price", "cash"];
        if (modifiers.includes(prevWord)) {
            return false; // Context not met (it's describing budget/stock, NOT a cancellation)
        }
    }
    return true; // Met
}

function extractBudgetNumber(message: string): number | undefined {
    const matches = message.match(/(?:rs\.?|lkr)?\s*(\d{3,6})\b/i);
    if (matches) {
        const val = parseInt(matches[1], 10);
        if (val > 100) return val;
    }
    return undefined;
}

const REJECTION_KEYWORDS = ["epa", "epaa", "venam", "venda", "vendam", "vendaa", "එපා", "வேண்டாம்"];

function detectDynamicExclusion(normalizedMessage: string): string | null {
    const words = normalizedMessage.split(/\s+/);
    const hasRejection = words.some(w => REJECTION_KEYWORDS.includes(w));
    if (!hasRejection) return null;

    for (const [categoryKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
        if (words.includes(categoryKey)) {
            return categoryKey;
        }
        for (const alias of aliases) {
            if (normalizedMessage.includes(alias)) {
                return categoryKey;
            }
        }
    }
    return null;
}

export class PreIntentParser {
    public static parse(message: string, history: any[], lastAssistantMessage: string | null = null): PreIntentResult {
        const normalizedMsg = normalizeText(message);
        
        // Dynamic product rejection check
        const dynamicExclusion = detectDynamicExclusion(normalizedMsg);
        if (dynamicExclusion) {
            console.log(`[PreIntentParser] Dynamic exclusion detected: ${dynamicExclusion}`);
            return {
                pre_classified: true,
                intent: "PRODUCT_REJECTION",
                flags: ["EXCLUDE_CATEGORY"],
                slots: {
                    exclusion_target: dynamicExclusion
                },
                fallback: "NONE"
            };
        }

        const dict = getDictionary();
        const matches: Array<{ entry: any; category: string; matchedPhrase: string }> = [];
        const consumedSpans: Array<{ start: number; end: number }> = [];

        // Collect all patterns to match
        const patterns: Array<{ phrase: string; entry: any; category: string }> = [];

        for (const [categoryKey, entries] of Object.entries(dict)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (entry.input) {
                    patterns.push({ phrase: entry.input, entry, category: categoryKey });
                }
                if (Array.isArray(entry.aliases)) {
                    for (const alias of entry.aliases) {
                        patterns.push({ phrase: alias, entry, category: categoryKey });
                    }
                }
            }
        }

        // Sort patterns by length descending to match longest first
        patterns.sort((a, b) => b.phrase.length - a.phrase.length);

        for (const pattern of patterns) {
            const phrase = pattern.phrase;
            const normPhrase = normalizeText(phrase);
            if (!normPhrase) continue;

            const index = normalizedMsg.indexOf(normPhrase);
            if (index !== -1) {
                // Check if this overlap has already been consumed by a longer match
                const start = index;
                const end = index + normPhrase.length;

                const overlap = consumedSpans.some(span => 
                    (start >= span.start && start < span.end) || 
                    (end > span.start && end <= span.end) || 
                    (span.start >= start && span.start < end)
                );

                if (!overlap && matchesPhrase(message, phrase)) {
                    // Match found!
                    matches.push({ entry: pattern.entry, category: pattern.category, matchedPhrase: phrase });
                    consumedSpans.push({ start, end });
                }
            }
        }

        if (matches.length === 0) {
            return {
                pre_classified: false,
                intent: null,
                flags: [],
                slots: {},
                fallback: "LLM"
            };
        }

        // Accumulate weights and resolve context gates
        const intentWeights: Record<string, number> = {};
        const flagsSet = new Set<string>();
        const slots: Record<string, any> = {};
        let allFailedContext = true;
        let highestConfidence = 0.0;

        for (const match of matches) {
            const entry = match.entry;
            
            // Check context gating
            if (entry.context_required) {
                let contextPassed = false;
                const phraseLower = match.matchedPhrase.toLowerCase();
                
                if (phraseLower.includes("hari")) {
                    contextPassed = checkHariContext(lastAssistantMessage);
                } else if (
                    phraseLower.includes("illai") || 
                    phraseLower.includes("ne") || 
                    phraseLower.includes("nehe") || 
                    phraseLower.includes("nae") || 
                    phraseLower.includes("nahe")
                ) {
                    contextPassed = checkNoContext(message, match.matchedPhrase);
                } else {
                    // Generic fallback context pass
                    contextPassed = true;
                }

                if (!contextPassed) {
                    console.log(`[PreIntentParser] Context gate failed for term: ${match.matchedPhrase}`);
                    continue;
                }
            }

            allFailedContext = false;

            // Map confidence to weight
            let weight = 0.5;
            if (entry.confidence === "HIGH") weight = 1.0;
            else if (entry.confidence === "MEDIUM") weight = 0.6;
            else if (entry.confidence === "LOW") weight = 0.3;

            highestConfidence = Math.max(highestConfidence, weight);

            if (entry.implied_intent) {
                intentWeights[entry.implied_intent] = (intentWeights[entry.implied_intent] || 0) + weight;
            }

            if (entry.implied_flag) {
                flagsSet.add(entry.implied_flag);
            }

            // Slot extraction
            if (entry.exclusion_target) {
                slots.exclusion_target = entry.exclusion_target;
            }

            if (match.category === "relationship_vocabulary") {
                const normVal = entry.normalized.toLowerCase();
                slots.recipient = normVal.startsWith("for ") ? normVal.replace("for ", "").trim() : normVal;
            }

            if (match.category === "occasion_vocabulary") {
                slots.occasion = entry.normalized.toLowerCase();
            }

            if (match.category === "budget_terms") {
                const num = extractBudgetNumber(message);
                if (num) {
                    slots.budget = num;
                }
            }
        }

        // If all matching terms failed context gating, return fallback: LLM
        if (allFailedContext) {
            console.log("[PreIntentParser] All matched terms failed context gating. Falling back to LLM.");
            return {
                pre_classified: false,
                intent: null,
                flags: [],
                slots: {},
                fallback: "LLM"
            };
        }

        // Find the intent with highest weight
        let bestIntent: string | null = null;
        let maxWeight = 0;
        for (const [intent, weight] of Object.entries(intentWeights)) {
            if (weight > maxWeight) {
                maxWeight = weight;
                bestIntent = intent;
            }
        }

        // Fallback rule check
        if (maxWeight < 0.4) {
            console.log(`[PreIntentParser] Weight threshold not met (${maxWeight.toFixed(2)} < 0.4). Falling back to LLM.`);
            return {
                pre_classified: false,
                intent: null,
                flags: [],
                slots: {},
                fallback: "LLM"
            };
        }

        // Confident classification if weight > 0.85
        const preClassified = maxWeight > 0.85;

        // Extract budget anyway if present in message
        if (!slots.budget) {
            const num = extractBudgetNumber(message);
            if (num) slots.budget = num;
        }

        return {
            pre_classified: preClassified,
            intent: preClassified ? bestIntent : null,
            flags: Array.from(flagsSet),
            slots,
            fallback: preClassified ? "NONE" : "LLM"
        };
    }
}
