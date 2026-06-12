import { LearningSignal, UserEvidence } from "./types";

export class EvidenceBuilder {
    // In memory store for MVP
    private static evidenceStore = new Map<string, UserEvidence[]>();

    public static async processSignal(signal: LearningSignal): Promise<UserEvidence> {
        const userEvidenceList = this.evidenceStore.get(signal.userId) || [];
        
        let evidence = userEvidenceList.find(e => 
            e.recipient === signal.recipient && 
            e.entityType === signal.entityType && 
            e.entityId === signal.entityId
        );

        if (!evidence) {
            evidence = {
                userId: signal.userId,
                recipient: signal.recipient,
                entityType: signal.entityType,
                entityId: signal.entityId,
                positiveSignals: 0,
                negativeSignals: 0,
                purchaseCount: 0,
                confidence: 0.0,
                lastPromotion: null
            };
            userEvidenceList.push(evidence);
        }

        // Aggregate Signal
        switch (signal.action) {
            case "PURCHASE":
                evidence.positiveSignals += 5;
                evidence.purchaseCount += 1;
                break;
            case "CLICK":
                evidence.positiveSignals += 1;
                break;
            case "IGNORE":
                evidence.negativeSignals += 1;
                break;
            case "EXPLICIT_DISLIKE":
                evidence.negativeSignals += 10;
                break;
        }

        evidence.confidence = this.calculateConfidence(evidence);
        this.evidenceStore.set(signal.userId, userEvidenceList);

        // TODO: UPSERT into `user_evidence` Supabase table
        return evidence;
    }

    private static calculateConfidence(evidence: UserEvidence): number {
        const totalSignals = evidence.positiveSignals + evidence.negativeSignals;
        if (totalSignals === 0) return 0;

        // Base confidence derived from positive ratio
        let base = evidence.positiveSignals / (totalSignals + 5); // +5 smoothing

        // High purchase count provides an absolute floor to confidence
        if (evidence.purchaseCount >= 3) {
            base = Math.max(base, 0.9); // 3 purchases = automatically VERIFIED zone
        } else if (evidence.purchaseCount >= 1) {
            base = Math.max(base, 0.6); // 1 purchase = automatically OBSERVED zone
        }

        // Negative signals drastically reduce confidence
        if (evidence.negativeSignals > evidence.positiveSignals) {
            base *= 0.2;
        }

        return Math.min(Math.max(base, 0.0), 1.0);
    }
}
