export type ConfidenceBand = "WEAK" | "OBSERVED" | "STRONG" | "VERIFIED";

export interface LearningSignal {
    userId: string;
    recipient: string | null;
    entityType: "product" | "category" | "tag";
    entityId: string;
    action: "PURCHASE" | "CLICK" | "IGNORE" | "EXPLICIT_DISLIKE";
    timestamp: Date;
}

export interface UserEvidence {
    id?: string;
    userId: string;
    recipient: string | null;
    entityType: "product" | "category" | "tag";
    entityId: string;
    positiveSignals: number;
    negativeSignals: number;
    purchaseCount: number;
    confidence: number;
    lastPromotion: Date | null;
}

export interface SuggestedMemory {
    userId: string;
    type: "PREFERENCE" | "RELATIONSHIP" | "BUDGET";
    content: string;
    confidence: number;
    status: "SUGGESTED" | "PROMOTED" | "CONFLICTED";
    evidenceId?: string;
}

export interface LearningTrace {
    decisionId: string;
    signalType: string;
    entity: string;
    recipient: string | null;
    scoreBefore: number;
    scoreAfter: number;
    confidenceBand: ConfidenceBand;
    promotionTriggered: boolean;
    memoryCreated: string | null;
    conflictDetected: boolean;
}

export const getConfidenceBand = (confidence: number): ConfidenceBand => {
    if (confidence < 0.4) return "WEAK";
    if (confidence < 0.7) return "OBSERVED";
    if (confidence < 0.9) return "STRONG";
    return "VERIFIED";
};
