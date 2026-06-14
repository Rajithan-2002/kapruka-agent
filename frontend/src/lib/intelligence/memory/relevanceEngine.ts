import { RankedMemory, RankedPreference } from "../../services/memoryService";

type MemoryItem = RankedMemory | RankedPreference;

export type ContextType = "GIFT" | "REORDER" | "TRACKING" | "DELIVERY" | "CHECKOUT" | "GENERAL";

export interface RelevanceResult {
    relevantMemories: MemoryItem[];
    ignoredMemories: MemoryItem[];
    reasoning: any[];
}

export class MemoryRelevanceEngine {
    
    /**
     * Determines the context type from the user query.
     */
    private static classifyContext(query: string): ContextType {
        const q = query.toLowerCase();
        if (q.includes("gift") || q.includes("birthday") || q.includes("anniversary")) return "GIFT";
        if (q.includes("reorder") || q.includes("again") || q.includes("last time")) return "REORDER";
        if (q.includes("track") || q.includes("where is") || q.includes("status")) return "TRACKING";
        if (q.includes("delivery") || q.includes("deliver") || q.includes("shipping")) return "DELIVERY";
        if (q.includes("checkout") || q.includes("buy") || q.includes("cart") || q.includes("pay")) return "CHECKOUT";
        return "GENERAL";
    }

    /**
     * Scores and ranks memories based on context, semantic overlap, confidence, and recency.
     */
    public static rankMemories(query: string, memories: MemoryItem[], explicitContext?: ContextType): RelevanceResult {
        const context = explicitContext || this.classifyContext(query);
        const queryTokens = new Set(query.toLowerCase().split(/\s+/));
        
        const scored = memories.map(mem => {
            const semanticScore = this.calculateSemanticScore(mem, queryTokens);
            const contextScore = this.calculateContextBoost(mem, context);
            const confidenceScore = Math.min(1.0, ((mem as any).confidence_score || (mem as any).importance_score || 0.5));
            const recencyScore = this.calculateRecencyScore(mem);

            const totalScore = (semanticScore * 0.4) + (contextScore * 0.3) + (confidenceScore * 0.2) + (recencyScore * 0.1);

            return {
                memory: mem,
                score: totalScore,
                breakdown: { semanticScore, contextScore, confidenceScore, recencyScore }
            };
        });

        // Sort descending
        scored.sort((a, b) => b.score - a.score);

        const MAX_ACTIVE_MEMORIES = 5;
        const MIN_SCORE_THRESHOLD = 0.45;

        const relevant: MemoryItem[] = [];
        const ignored: MemoryItem[] = [];
        const reasoning: any[] = [];

        scored.forEach(s => {
            if (s.score > MIN_SCORE_THRESHOLD && relevant.length < MAX_ACTIVE_MEMORIES) {
                relevant.push(s.memory);
                reasoning.push({
                    id: s.memory.id,
                    memory: "interest" in s.memory ? s.memory.interest : `${s.memory.key} ${s.memory.value}`,
                    selectedReason: s.breakdown.semanticScore > s.breakdown.contextScore ? "semantic match" : "context match",
                    score: s.score.toFixed(3),
                    breakdown: s.breakdown
                });
            } else {
                ignored.push(s.memory);
            }
        });

        return {
            relevantMemories: relevant,
            ignoredMemories: ignored,
            reasoning
        };
    }

    private static calculateSemanticScore(mem: MemoryItem, queryTokens: Set<string>): number {
        let content = "";
        if ("interest" in mem) {
            content = `${mem.interest}`;
        } else {
            content = `${mem.category} ${mem.key} ${mem.value}`;
        }
        
        const memTokens = content.toLowerCase().split(/\s+/);
        let overlap = 0;
        for (const token of memTokens) {
            if (queryTokens.has(token)) overlap++;
        }
        
        return Math.min(1.0, overlap / Math.max(1, memTokens.length));
    }

    private static calculateContextBoost(mem: MemoryItem, context: ContextType): number {
        // Check for negative preference first — hard penalty regardless of context
        const isNegative = "interest" in mem
            ? (mem.interest || "").toLowerCase().startsWith("dislikes:")
            : (mem.value || "").toLowerCase().includes(" dislikes ");
        if (isNegative) return -2.0; // Hard penalty: guarantees final score < 0.45 threshold

        // GIFT context: boost both direct preference records AND conversational preference memories
        if (context === "GIFT" && ("interest" in mem || mem.category === "preference")) return 1.0;

        // REORDER context: boost purchase history memories
        if (context === "REORDER" && !("interest" in mem) && mem.category === "purchase_history") return 1.0;

        return 0.2; // Baseline for unrelated memories
    }

    private static calculateRecencyScore(mem: MemoryItem): number {
        const dateStr = mem.lastConfirmedAt || ("timestamp" in mem ? mem.timestamp : mem.last_used_at);
        if (!dateStr) return 0.5;
        
        const ageMs = Date.now() - new Date(dateStr).getTime();
        const days = ageMs / (1000 * 60 * 60 * 24);
        
        if (days < 30) return 1.0;
        if (days < 90) return 0.9;
        if (days < 180) return 0.8;
        if (days < 365) return 0.6;
        return 0.4;
    }
}
