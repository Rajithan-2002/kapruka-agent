import { RankedMemory, RankedPreference } from "../../services/memoryService";

type MemoryItem = RankedMemory | RankedPreference;

export class MemoryDecayEngine {
    
    /**
     * Calculates the effective confidence of a memory.
     * Formula: effective_confidence = base_confidence * freshness_factor * reinforcement_factor
     */
    public static calculateDecay(mem: MemoryItem): number {
        const baseConfidence = (mem as any).confidence_score || mem.importance_score || 0.5;
        const freshnessFactor = this.getFreshnessFactor(mem);
        // Reinforcement factor: For MVP, we can assume reinforcement boosts base_confidence over time. 
        // We'll keep factor at 1.0 here since base_confidence already accounts for it.
        const reinforcementFactor = 1.0; 

        return baseConfidence * freshnessFactor * reinforcementFactor;
    }

    /**
     * Updates the verificationStatus based on decayed confidence.
     */
    public static applyDecay(mem: MemoryItem): MemoryItem {
        const effectiveConfidence = this.calculateDecay(mem);
        
        if (effectiveConfidence < 0.3) {
            mem.verificationStatus = "VERIFY_BEFORE_USE";
        }
        
        return mem;
    }

    private static getFreshnessFactor(mem: MemoryItem): number {
        const dateStr = mem.lastConfirmedAt || ("timestamp" in mem ? mem.timestamp : mem.last_used_at);
        if (!dateStr) return 1.0;
        
        const ageMs = Date.now() - new Date(dateStr).getTime();
        const days = ageMs / (1000 * 60 * 60 * 24);
        
        if (days < 30) return 1.0;
        if (days < 90) return 0.9;
        if (days < 180) return 0.8;
        if (days < 365) return 0.6;
        return 0.4;
    }
}
