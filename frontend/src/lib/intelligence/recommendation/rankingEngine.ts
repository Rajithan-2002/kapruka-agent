import { RecommendationCandidate } from "./types";
import { AffinityRecord } from "./affinityEngine";
import { FeatureFlags } from "../config/featureFlags";

export interface MemoryInfluenceRecord {
    memory: string;          // e.g. "likes coffee"
    scoreDelta: number;      // e.g. +0.05 or 0 for blocked
    blocked: boolean;        // true if this was a negative match causing rejection
}

export interface RankingContext {
    searchQuery: string;
    situation: string; // occasion type (e.g. "birthday")
    recipient: string; // recipient type (e.g. "mother")
    targetBudget: number; // target budget
    userAffinities: AffinityRecord[];
    communityScores: Record<string, { likeRate: number; purchaseRate: number; bundleRate: number; score: number }>;
    trendScores: Record<string, number>;
    queryIntelligence?: { entity: string; score: number }[];
    memoryTags?: string[];         // positive memory tags for boosting
    negativeMemoryTags?: string[]; // negative preference tags for hard rejection
    isBudgetExplicit?: boolean;
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
                communityScore: 0.5,
                trendScore: 0.5,
                finalScore: rawProducts.length - i
            }));
        }

        const totalItems = rawProducts.length || 1;
        const candidates: RecommendationCandidate[] = rawProducts.map((p, index) => {
            const pid = p.id || p.product_id;
            
            // 1. Situation Match (30%)
            let situationScore = this.calcSituationScore(p, context.situation, context.searchQuery);
            
            // 2. Recipient Match (20%)
            let recipientScore = this.calcRecipientScore(p, context.recipient);

            // Apply child context boosts
            if (p.childBoost) {
                situationScore = Math.min(1.0, situationScore + 0.3);
                recipientScore = Math.min(1.0, recipientScore + 0.3);
            }
            
            // 3. Delivery Feasibility (20%) - Hard Requirement
            const deliveryScore = this.calcDeliveryScore(p);
            
            // 4. Budget Match (10%)
            const budgetScore = this.calcBudgetScore(p, context.targetBudget);
            
            // 5. Personal Affinity (10%)
            const affinityScore = this.calcAffinityScore(p, context.userAffinities);
            
            // 6. Community Confidence (5%)
            const commStats = context.communityScores[pid] || { likeRate: 0.5, purchaseRate: 0.0, bundleRate: 0.0, score: 0.5 };
            const communityScore = commStats.score;
            
            // 7. Trend Score (5%)
            const trendScore = context.trendScores[pid] !== undefined ? context.trendScores[pid] : 0.5;

            // Memory tags & Query Intelligence for additional boosts
            const memoryBoostScore = this.calcMemoryBoost(p, context.memoryTags || []);
            const queryIntelScore = this.calcQueryIntelligenceBoost(p, context.queryIntelligence || []);
            const intelMultiplier = 1.0 + (queryIntelScore / 100);

            // V1.5 Recommendation Formula
            const rawScore = 
                (situationScore * 0.30) + 
                (recipientScore * 0.20) + 
                (deliveryScore * 0.20) + 
                (budgetScore * 0.10) + 
                (affinityScore * 0.10) + 
                (communityScore * 0.05) + 
                (trendScore * 0.05);

            // Apply boosts
            let finalScore = (rawScore + (memoryBoostScore * 0.05)) * intelMultiplier;

            // Apply child context penalty - refined from 0.05 to 0.5 to prevent complete wipeout
            if (p.childPenalty) {
                finalScore *= 0.5;
            }

            // Hard constraints check: out of stock or completely out of budget range receives severe penalty
            if (p.in_stock === false || p.inStock === false || deliveryScore === 0) {
                finalScore = 0.0;
            }
            if (context.isBudgetExplicit && budgetScore === 0) {
                finalScore = 0.0;
            }

            // Negative memory — hard rejection before returning
            const isNegativeBlocked = this.calcNegativePenalty(p, context.negativeMemoryTags || []);
            if (isNegativeBlocked) {
                finalScore = 0.0;
            }

            // Build memory influence record for God Mode
            const memoryInfluence: MemoryInfluenceRecord[] = [];
            if (isNegativeBlocked) {
                const matchedTag = (context.negativeMemoryTags || []).find(tag => {
                    const pStr = (p.name + " " + (p.tags || "") + " " + (p.summary || "")).toLowerCase();
                    return pStr.includes(tag.toLowerCase());
                });
                if (matchedTag) {
                    memoryInfluence.push({ memory: `dislikes ${matchedTag}`, scoreDelta: 0, blocked: true });
                }
            } else if (memoryBoostScore > 0) {
                const matchedTag = (context.memoryTags || []).find(tag => {
                    const keyword = tag.split(" ").pop()?.toLowerCase();
                    const pStr = (p.tags || p.name || "").toLowerCase();
                    return keyword && pStr.includes(keyword);
                });
                if (matchedTag) {
                    memoryInfluence.push({
                        memory: matchedTag,
                        scoreDelta: parseFloat((memoryBoostScore * 0.05).toFixed(3)),
                        blocked: false
                    });
                }
            }

            return {
                productId: pid,
                productData: p,
                situationScore,
                recipientScore,
                deliveryScore,
                budgetScore,
                affinityScore,
                memoryBoostScore,
                communityScore,
                trendScore,
                finalScore: parseFloat(finalScore.toFixed(3)),
                memoryInfluence
            };
        });

        // Filter out zero scores (failed hard constraints)
        const validCandidates = candidates.filter(c => c.finalScore > 0);

        // Sort descending
        validCandidates.sort((a, b) => b.finalScore - a.finalScore);

        return validCandidates;
    }

    private static calcSituationScore(product: any, situation: string, searchQuery: string): number {
        let score = 0.4; // Base score
        const catStr = typeof product.category === 'object' && product.category !== null ? (product.category.name || product.category.id || "") : (product.category || "");
        const pTags = (product.name + " " + (product.summary || "") + " " + (product.tags || "") + " " + (product.categories || "") + " " + catStr).toLowerCase();
        
        if (situation) {
            const occ = situation.toLowerCase().trim();
            if (pTags.includes(occ)) score += 0.3;
            if (occ === "birthday" && pTags.includes("cake")) score += 0.15;
            if (occ === "anniversary" && (pTags.includes("rose") || pTags.includes("flower"))) score += 0.15;
        }

        if (searchQuery) {
            const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "for" && w !== "the" && w !== "and");
            let matched = 0;
            for (const word of words) {
                if (pTags.includes(word)) matched++;
            }
            if (words.length > 0) {
                score += 0.3 * (matched / words.length);
            }
        }

        return Math.max(0.0, Math.min(1.0, score));
    }

    private static calcRecipientScore(product: any, recipient: string): number {
        let score = 0.5; // Neutral baseline
        if (recipient) {
            const recip = recipient.toLowerCase().trim();
            const catStr = typeof product.category === 'object' && product.category !== null ? (product.category.name || product.category.id || "") : (product.category || "");
            const pTags = (product.name + " " + (product.summary || "") + " " + (product.tags || "") + " " + catStr).toLowerCase();
            
            const girlfriendWife = ["rose", "flower", "chocolate", "teddy", "perfume", "jewelry", "pendant", "ring", "red", "heart", "hamper"];
            const fatherDad = ["wallet", "belt", "watch", "shaving", "perfume", "coffee", "mug", "electronics", "card", "shirt", "tool", "hamper"];
            const motherMom = ["spa", "saree", "flower", "rose", "cake", "mug", "chocolate", "pendant", "tea", "perfume", "handbag", "jewelry", "hamper"];
            const boyfriendHusband = ["wallet", "belt", "watch", "perfume", "electronics", "mug", "shirt", "grooming", "hamper"];
            const childBaby = ["toy", "bear", "balloon", "chocolate", "sweet", "game", "soft", "kid", "baby", "hamper"];

            let matchKeywords: string[] = [];
            if (recip === "mother" || recip === "mom" || recip === "amma") matchKeywords = motherMom;
            else if (recip === "father" || recip === "dad" || recip === "thaththa") matchKeywords = fatherDad;
            else if (recip === "girlfriend" || recip === "wife" || recip === "spouse" || recip === "romantic") matchKeywords = girlfriendWife;
            else if (recip === "boyfriend" || recip === "husband") matchKeywords = boyfriendHusband;
            else if (recip === "child" || recip === "son" || recip === "daughter" || recip === "baby" || recip === "kid") matchKeywords = childBaby;

            if (matchKeywords.length > 0) {
                const matched = matchKeywords.some(kw => pTags.includes(kw));
                if (matched) score = 1.0;
                else score = 0.3; // Demote slightly if irrelevant to recipient
            }
        }
        return score;
    }

    private static calcDeliveryScore(product: any): number {
        const inStock = product.in_stock !== false && product.inStock !== false;
        if (!inStock) return 0.0;

        const deliveryText = (product.delivery || "").toLowerCase();
        let score = 0.5; // Standard delivery
        
        // Express delivery gets high score
        if (deliveryText.includes("same day") || deliveryText.includes("arrives today") || deliveryText.includes("hour")) {
            score = 1.0;
        }

        // Heavy penalty multiplier if blocked/penalized
        if (product.penaltyFlag) {
            score *= 0.1;
        }

        return score;
    }

    private static calcBudgetScore(product: any, targetBudget: number): number {
        const price = product.price?.amount || product.price || 0;
        if (targetBudget <= 0) return 0.8; // Default if target budget not set

        if (price <= targetBudget) {
            // High score for items matching budget closely, but within range
            return 1.0;
        } else if (price <= targetBudget * 1.2) {
            return 0.4; // Exceeds budget slightly, tolerated but penalised
        } else {
            return 0.0; // Hard budget filter: exceeds budget by >20%
        }
    }

    private static calcAffinityScore(product: any, affinities: AffinityRecord[]): number {
        if (!affinities || !affinities.length) return 0.5; // Cold start
        
        const rawCategory = product.category;
        const category = (typeof rawCategory === 'object' && rawCategory !== null ? (rawCategory.name || rawCategory.id || "") : (rawCategory || "")).toLowerCase();
        const catAffinity = affinities.find(a => a.targetType === "category" && a.targetId.toLowerCase() === category);
        
        if (catAffinity) {
            // Map raw score [-5, +10] to [0.0, 1.0]
            const raw = catAffinity.score;
            let score = 0.5 + (raw / 10);
            return Math.max(0.0, Math.min(1.0, score));
        }

        return 0.5;
    }

    private static calcMemoryBoost(product: any, memoryTags: string[]): number {
        if (!memoryTags.length) return 0.0;
        
        const pTags = (product.tags || product.name || "").toLowerCase();
        for (const tag of memoryTags) {
            const keyword = tag.split(" ").pop()?.toLowerCase();
            if (keyword && pTags.includes(keyword)) {
                return 1.0; // Strong boost if matches memory tag
            }
        }
        return 0.0;
    }

    /**
     * Returns true if the product matches any negative memory tag (dislike).
     * Used to hard-reject products the user/recipient dislikes.
     */
    private static calcNegativePenalty(product: any, negativeTags: string[]): boolean {
        if (!negativeTags?.length) return false;
        const pTags = (product.name + " " + (product.tags || "") + " " + (product.summary || "") + " " + (product.category?.name || product.category || "")).toLowerCase();
        return negativeTags.some(tag => {
            const cleanTag = tag.trim().toLowerCase();
            if (cleanTag.length < 3) return false;
            // Use bounded word matching so substrings of words don't trigger rejection (e.g. "tea" matching "steam")
            const escapedTag = cleanTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTag}\\b`, 'i');
            return regex.test(pTags);
        });
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

