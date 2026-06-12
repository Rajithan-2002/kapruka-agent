import { FeatureFlags } from "../config/featureFlags";

export type AffinityAction = "PURCHASE" | "ADD_TO_BUNDLE" | "CLICK" | "IGNORE" | "EXPLICIT_DISLIKE";

export interface AffinityRecord {
    targetType: "product" | "category" | "tag";
    targetId: string;
    score: number;
}

export class AffinityEngine {
    
    // In memory cache for MVP. Should hit Supabase `user_affinities`.
    private static cache = new Map<string, AffinityRecord[]>();

    public static async getAffinities(userId: string): Promise<AffinityRecord[]> {
        if (!FeatureFlags.ENABLE_AFFINITY_ENGINE) return [];
        return this.cache.get(userId) || [];
    }

    public static async recordInteraction(userId: string, targetType: "product" | "category" | "tag", targetId: string, action: AffinityAction): Promise<void> {
        if (!FeatureFlags.ENABLE_AFFINITY_ENGINE) return;

        let delta = 0;
        switch (action) {
            case "PURCHASE": delta = 5.0; break;
            case "ADD_TO_BUNDLE": delta = 3.0; break;
            case "CLICK": delta = 1.0; break;
            case "IGNORE": delta = -0.1; break;
            case "EXPLICIT_DISLIKE": delta = -5.0; break;
        }

        const userAffinities = this.cache.get(userId) || [];
        const existing = userAffinities.find(a => a.targetType === targetType && a.targetId === targetId);
        
        if (existing) {
            existing.score += delta;
        } else {
            userAffinities.push({ targetType, targetId, score: delta });
        }

        this.cache.set(userId, userAffinities);

        // TODO: UPSERT into Supabase `user_affinities` table
    }
}
