import { RankedMemory, RankedPreference } from "../../services/memoryService";

type MemoryItem = RankedMemory | RankedPreference;

export class MemoryConflictResolver {
    /**
     * Resolves conflicts among memories.
     * Higher priority is given to explicit user input, higher confidence, and newer memories.
     */
    public static resolve(memories: MemoryItem[]): MemoryItem[] {
        // Group memories by a unique signature (e.g., category + key or relationship_id + interest)
        const groups = new Map<string, MemoryItem[]>();

        for (const mem of memories) {
            const signature = this.getSignature(mem);
            if (!groups.has(signature)) {
                groups.set(signature, []);
            }
            groups.get(signature)!.push(mem);
        }

        const resolved: MemoryItem[] = [];

        for (const [signature, group] of groups.entries()) {
            if (group.length === 1) {
                resolved.push(group[0]);
            } else {
                resolved.push(this.resolveGroup(group));
            }
        }

        return resolved;
    }

    private static getSignature(mem: MemoryItem): string {
        if ("interest" in mem) {
            // It's a preference
            return `pref_${mem.relationship_id || "self"}_${mem.interest.toLowerCase()}`;
        } else {
            // It's a memory
            return `mem_${mem.category}_${mem.key.toLowerCase()}_${mem.value.toLowerCase()}`;
        }
    }

    private static resolveGroup(group: MemoryItem[]): MemoryItem {
        return group.reduce((prev, current) => {
            const scorePrev = this.scoreMemoryForConflict(prev);
            const scoreCurrent = this.scoreMemoryForConflict(current);
            return scoreCurrent > scorePrev ? current : prev;
        });
    }

    private static scoreMemoryForConflict(mem: MemoryItem): number {
        let score = 0;

        // 1. Source Origin is the highest priority
        if (mem.memoryOrigin === "USER_EXPLICIT") score += 1000;
        else if (mem.memoryOrigin === "USER_IMPLICIT") score += 500;
        else if (mem.memoryOrigin === "PURCHASE_BEHAVIOR") score += 300;
        else if (mem.memoryOrigin === "LLM_INFERRED") score += 100;
        else score += 50;

        // 2. Confidence
        score += ((mem as any).confidence_score || mem.importance_score || 0.5) * 50;

        // 3. Recency
        const dateStr = mem.lastConfirmedAt || ("timestamp" in mem ? mem.timestamp : mem.last_used_at);
        if (dateStr) {
            const ageMs = Date.now() - new Date(dateStr).getTime();
            // Inverse scaling (newer = higher)
            score += Math.max(0, 50 - (ageMs / (1000 * 60 * 60 * 24))); // up to +50 points for very recent
        }

        return score;
    }
}
