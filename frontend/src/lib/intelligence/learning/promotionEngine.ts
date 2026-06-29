import { UserEvidence, SuggestedMemory, getConfidenceBand } from "./types";
import { LearningConflictResolver } from "./conflictResolver";
import { addMemory } from "../../services/memoryService";

export class PromotionEngine {

    // 90-day cooldown in milliseconds
    private static readonly COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

    public static async evaluateEvidence(evidence: UserEvidence): Promise<SuggestedMemory | null> {
        const band = getConfidenceBand(evidence.confidence);

        // Stage 1: Filter out Weak/Observed
        if (band === "WEAK" || band === "OBSERVED") {
            return null;
        }

        // Stage 2: Cooldown Check
        if (evidence.lastPromotion) {
            const timeSince = Date.now() - evidence.lastPromotion.getTime();
            if (timeSince < this.COOLDOWN_MS) {
                console.log(`[PromotionEngine] Evidence for ${evidence.entityId} is in 90-day cooldown.`);
                return null;
            }
        }

        // Stage 3: Construct Suggested Memory
        const content = evidence.recipient 
            ? `${evidence.recipient} appears to have a strong preference for ${evidence.entityId}`
            : `User has a strong preference for ${evidence.entityId}`;

        const type = evidence.recipient ? "RELATIONSHIP" : "PREFERENCE";

        const suggested: SuggestedMemory = {
            userId: evidence.userId,
            type,
            content,
            confidence: evidence.confidence,
            status: "SUGGESTED",
            evidenceId: evidence.id
        };

        // Stage 4: Conflict Resolution
        const hasConflict = await LearningConflictResolver.detectConflict(suggested, evidence);
        if (hasConflict) {
            suggested.status = "CONFLICTED";
            return suggested; // Stops here, queued for review
        }

        // Stage 5: Promotion Execution
        if (band === "VERIFIED") {
            await this.executePromotion(suggested, evidence);
        }

        return suggested;
    }

    private static async executePromotion(suggested: SuggestedMemory, evidence: UserEvidence) {
        console.log(`[PromotionEngine] Promoting suggested memory: ${suggested.content}`);
        
        // Insert to memories table
        await addMemory(suggested.userId, suggested.type.toLowerCase(), "System", suggested.content);


        // Update evidence cooldown
        evidence.lastPromotion = new Date();
        suggested.status = "PROMOTED";

        // Persist lastPromotion to Supabase so cooldown survives server restarts
        try {
            const { supabase, useCloud } = await import("../../db");
            if (useCloud && supabase) {
                await supabase.from("user_evidence")
                    .update({ last_promotion: new Date().toISOString() })
                    .eq("user_id", evidence.userId)
                    .eq("entity_type", evidence.entityType)
                    .eq("entity_id", evidence.entityId);
            }
        } catch (err) {
            console.warn("[PromotionEngine] Failed to persist lastPromotion to Supabase:", err);
        }

    }
}
