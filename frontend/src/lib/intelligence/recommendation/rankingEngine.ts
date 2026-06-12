import { RecommendationCandidate } from "./types";
import { AffinityRecord } from "./affinityEngine";
import { FeatureFlags } from "../config/featureFlags";

export interface RankingContext {
    searchQuery: string;
    situation: any;
    memoryTags: string[];
    userAffinities: AffinityRecord[];
    queryIntelligence?: { entity: string; score: number }[];
}

export class RankingEngine {

    public static rankProducts(rawProducts: any[], context: RankingContext): RecommendationCandidate[] {
        if (!FeatureFlags.ENABLE_RANKING_ENGINE) {
            // Bypass scoring if degraded, just return dummy scores maintaining original order
            return rawProducts.map((p, i) => ({
                productId: p.id || `mock-${i}`,
                productData: p,
                situationScore: 0,
                recipientScore: 0,
                deliveryScore: 0,
                budgetScore: 0,
                affinityScore: 0,
                memoryBoostScore: 0,
                finalScore: rawProducts.length - i
            }));
        }

        const totalItems = rawProducts.length || 1;
        const candidates: RecommendationCandidate[] = rawProducts.map((p, index) => {
            const situationScore = this.calcSituationScore(p, context.situation, context.searchQuery);
            const affinityScore = this.calcAffinityScore(p, context.userAffinities);
            const memoryBoostScore = this.calcMemoryBoost(p, context.memoryTags);
            const queryIntelScore = this.calcQueryIntelligenceBoost(p, context.queryIntelligence || []);
            
            const baseRelevance = 1.0 - (index / totalItems);

            // Other dimensions can be calculated here
            const recipientScore = 1.0;
            const deliveryScore = 1.0;
            const budgetScore = 1.0;

            // The query intelligence score acts as a multiplier: +15 score -> +0.15 boost
            const intelMultiplier = 1.0 + (queryIntelScore / 100);
            const rawScore = (situationScore * 0.25) + (affinityScore * 0.3) + (memoryBoostScore * 0.25) + (baseRelevance * 0.2);
            const finalScore = rawScore * intelMultiplier;

            return {
                productId: p.id || p.product_id,
                productData: p,
                situationScore,
                recipientScore,
                deliveryScore,
                budgetScore,
                affinityScore,
                memoryBoostScore,
                finalScore
            };
        });

        // Sort descending
        candidates.sort((a, b) => b.finalScore - a.finalScore);

        return candidates;
    }

    private static calcSituationScore(product: any, situation: any, searchQuery: string): number {
        let score = 0.3; // Base score lowered so relevance matters more

        const pTags = (product.name + " " + (product.tags || "") + " " + (product.categories || "") + " " + (product.category || "")).toLowerCase();
        
        // 1. Situation/Occasion Match
        if (situation && situation.occasion && situation.occasion !== "UNKNOWN") {
            const occ = situation.occasion.toLowerCase();
            if (pTags.includes(occ)) score += 0.3;
        }

        // 2. Direct Search Query Match (Crucial for non-occasion shopping)
        if (searchQuery) {
            const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "for" && w !== "the" && w !== "and");
            let matched = false;
            for (const word of words) {
                if (pTags.includes(word)) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                score += 0.4;
            }
        }

        return Math.max(0.0, Math.min(1.0, score));
    }

    private static calcAffinityScore(product: any, affinities: AffinityRecord[]): number {
        if (!affinities.length) return 0.5;
        let score = 0.5;

        // Check if user has explicit affinity for this category
        const catAffinity = affinities.find(a => a.targetType === "category" && a.targetId === product.category);
        if (catAffinity) {
            // Map raw score [-5, +10] to [0.0, 1.0] approx
            score += (catAffinity.score / 10);
        }

        return Math.max(0.0, Math.min(1.0, score));
    }

    private static calcMemoryBoost(product: any, memoryTags: string[]): number {
        if (!memoryTags.length) return 0.0;
        
        const pTags = (product.tags || product.name || "").toLowerCase();
        for (const tag of memoryTags) {
            const keyword = tag.split(" ").pop()?.toLowerCase();
            if (keyword && pTags.includes(keyword)) {
                return 1.0; // Strong boost if it matches a memory exactly
            }
        }
        return 0.0;
    }

    private static calcQueryIntelligenceBoost(product: any, intelligenceRecords: { entity: string; score: number }[]): number {
        if (!intelligenceRecords || !intelligenceRecords.length) return 0.0;
        
        const pTags = (product.name + " " + (product.tags || "") + " " + (product.categories || "") + " " + (product.category || "")).toLowerCase();
        
        let totalBoost = 0;
        for (const record of intelligenceRecords) {
            if (pTags.includes(record.entity.toLowerCase())) {
                totalBoost += record.score;
            }
        }
        return totalBoost;
    }
}
