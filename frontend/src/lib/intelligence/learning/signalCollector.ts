import { LearningSignal } from "./types";
import { EvidenceBuilder } from "./evidenceBuilder";
import { PromotionEngine } from "./promotionEngine";

export class SignalCollector {

    /**
     * Entry point for Realtime Delta Analysis.
     * Fires asynchronously after checkout or session actions.
     */
    public static async collect(signal: LearningSignal) {
        console.log(`[SignalCollector] Collected ${signal.action} for ${signal.entityId}`);

        // 1. Build/Update Evidence
        const evidence = await EvidenceBuilder.processSignal(signal);

        // 2. Attempt Promotion
        const suggested = await PromotionEngine.evaluateEvidence(evidence);

        // 3. Log Trace
        await this.logTrace(signal, evidence, suggested);
    }

    private static async logTrace(signal: LearningSignal, evidence: any, suggested: any) {
        const trace = {
            engine: "learning_engine",
            decisionId: `learn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            signalType: signal.action,
            entity: signal.entityId,
            recipient: signal.recipient,
            confidenceAfter: evidence.confidence,
            promotionTriggered: suggested?.status === "PROMOTED",
            memoryCreated: suggested?.status === "PROMOTED" ? suggested.content : null,
            conflictDetected: suggested?.status === "CONFLICTED"
        };
        
        console.log("Kappy Learning Trace:", JSON.stringify(trace, null, 2));
        
        // Expose to global tracing for Judge Mode
        if ((global as any).intelligence) {
            (global as any).intelligence.traces.push(trace);
        }
    }
}
