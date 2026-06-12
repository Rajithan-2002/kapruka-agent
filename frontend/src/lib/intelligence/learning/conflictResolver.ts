import { UserEvidence, SuggestedMemory } from "./types";
import { getMemories, RankedMemory } from "../../services/memoryService";

export class LearningConflictResolver {
    
    /**
     * Checks if a newly suggested memory contradicts an existing permanent memory.
     * Returns true if there is a conflict.
     */
    public static async detectConflict(suggested: SuggestedMemory, evidence: UserEvidence): Promise<boolean> {
        const memories = await getMemories(suggested.userId);
        
        for (const memory of memories) {
            if (this.isContradiction(memory, suggested, evidence.entityId)) {
                // Queue for review
                await this.queueConflict(evidence.userId, memory.id, evidence.id || "temp");
                return true;
            }
        }
        
        return false;
    }

    private static isContradiction(
        existingMemory: RankedMemory,
        suggestedMemory: SuggestedMemory,
        entityId: string
    ): boolean {
        const existingContent = (existingMemory.value || '').toLowerCase();
        const suggestedContent = (suggestedMemory.content || '').toLowerCase();
        const entId = entityId.toLowerCase();
        
        // Both memories are about the same entity
        const sameEntity = existingContent.includes(entId) && suggestedContent.includes(entId);
        
        // But they contain different factual claims (e.g. one likes, one dislikes)
        const differentClaim = existingContent !== suggestedContent && (
            (existingContent.includes("dislike") && suggestedContent.includes("like")) ||
            (existingContent.includes("likes") && suggestedContent.includes("dislike")) ||
            (existingContent.includes("prefer") && suggestedContent.includes("dislike"))
        );
        
        return sameEntity && differentClaim;
    }

    private static async queueConflict(userId: string, existingMemoryId: string, newEvidenceId: string) {
        console.warn(`[LearningConflictResolver] Conflict detected between Memory ${existingMemoryId} and Evidence ${newEvidenceId}. Queued for review.`);
        // TODO: Insert into `learning_conflict_queue` Supabase table
    }
}
