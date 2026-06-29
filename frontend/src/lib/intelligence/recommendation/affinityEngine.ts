import { FeatureFlags } from "../config/featureFlags";
import { supabase, useCloud } from "../../db";

export type AffinityAction = "PURCHASE" | "ADD_TO_BUNDLE" | "CLICK" | "IGNORE" | "EXPLICIT_DISLIKE";

// High-signal actions that get persisted to the database
const DB_PERSISTED_ACTIONS: AffinityAction[] = ["PURCHASE", "ADD_TO_BUNDLE", "EXPLICIT_DISLIKE"];

export interface AffinityRecord {
    targetType: "product" | "category" | "tag";
    targetId: string;
    score: number;
}

export class AffinityEngine {
    
    // In-memory cache — falls back to this when DB is unavailable
    private static cache = new Map<string, AffinityRecord[]>();

    public static async getAffinities(userId: string): Promise<AffinityRecord[]> {
        if (!FeatureFlags.ENABLE_AFFINITY_ENGINE) return [];

        // Try fetching from Supabase first
        if (useCloud && supabase) {
            try {
                const { data, error } = await supabase
                    .from("user_affinities")
                    .select("target_type, target_id, affinity_score")
                    .eq("user_id", userId)
                    .order("affinity_score", { ascending: false });

                if (!error && data && data.length > 0) {
                    const records: AffinityRecord[] = data.map((row: any) => ({
                        targetType: row.target_type,
                        targetId: row.target_id,
                        score: parseFloat(row.affinity_score) || 0
                    }));
                    // Sync back to cache
                    this.cache.set(userId, records);
                    return records;
                }
            } catch (err) {
                console.warn("[AffinityEngine] Supabase fetch failed, falling back to cache:", err);
            }
        }

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

        // Memory Leak Protection: Cap cache to 1000 users using FIFO eviction
        if (this.cache.size >= 1000 && !this.cache.has(userId)) {
            const oldestUserId = this.cache.keys().next().value;
            if (oldestUserId) this.cache.delete(oldestUserId);
        }

        // Update in-memory cache
        const userAffinities = this.cache.get(userId) || [];
        const existing = userAffinities.find(a => a.targetType === targetType && a.targetId === targetId);
        if (existing) {
            existing.score += delta;
        } else {
            userAffinities.push({ targetType, targetId, score: delta });
        }
        this.cache.set(userId, userAffinities);

        // Only persist high-signal actions to the database
        if (!DB_PERSISTED_ACTIONS.includes(action)) return;
        if (!useCloud || !supabase) return;

        try {
            // Fetch current DB score to apply decay before updating
            const { data: existing } = await supabase
                .from("user_affinities")
                .select("affinity_score, updated_at")
                .eq("user_id", userId)
                .eq("target_type", targetType)
                .eq("target_id", targetId)
                .maybeSingle();

            let newScore = delta;
            if (existing) {
                // Apply time-based affinity decay before accumulating new signal
                const daysSinceUpdate = (Date.now() - new Date(existing.updated_at).getTime()) / 86400000;
                const decayFactor = daysSinceUpdate < 30 ? 1.0
                    : daysSinceUpdate < 90 ? 0.7
                    : daysSinceUpdate < 180 ? 0.4
                    : 0.2;
                const decayedPrior = (parseFloat(existing.affinity_score) || 0) * decayFactor;
                newScore = decayedPrior + delta;
            }

            await supabase.from("user_affinities").upsert({
                user_id: userId,
                target_type: targetType,
                target_id: targetId,
                affinity_score: newScore,
                updated_at: new Date().toISOString()
            }, { onConflict: "user_id,target_type,target_id" });

        } catch (err) {
            console.error("[AffinityEngine] Failed to persist affinity to Supabase:", err);
        }
    }
}
