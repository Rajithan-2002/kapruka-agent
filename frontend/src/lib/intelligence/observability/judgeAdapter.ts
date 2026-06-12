import { EngineTrace, JudgePayload, TimelineEvent } from "./types";
import { FeatureFlags } from "../config/featureFlags";

export class JudgeAdapter {

    public static compress(traceId: string, traces: EngineTrace<any, any>[]): JudgePayload {
        
        let totalDurationMs = 0;
        const timeline: TimelineEvent[] = [];
        let confidences = { intent: 0, memory: 0, recommendation: 0 };
        const recommendationBreakdowns: any[] = [];

        traces.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (let i = 0; i < traces.length; i++) {
            const trace = traces[i];
            totalDurationMs += trace.durationMs;

            // 1. Build Timeline
            let title = `Engine: ${trace.engine}`;
            let description = "Processed successfully.";

            if (trace.engine === "UNDERSTANDING") {
                title = "Intent Understood";
                description = `User wants to ${trace.output?.intent}.`;
                confidences.intent = trace.output?.confidence || 0.95; // Mock for now
            } else if (trace.engine === "MEMORY") {
                title = "Memory Retrieved";
                description = `Loaded ${trace.output?.loadedCount} memories, selected ${trace.output?.selectedCount}.`;
                confidences.memory = trace.output?.maxConfidence || 0;
            } else if (trace.engine === "RULE") {
                title = "Rule Evaluated";
                description = `Rule '${trace.output?.selectedRule}' won priority.`;
            } else if (trace.engine === "RANKING") {
                title = "Products Ranked";
                description = `Ranked ${trace.output?.rankedCount} items.`;
                confidences.recommendation = trace.output?.topScore || 0;
                
                // Extract recommendation breakdowns
                if (trace.output?.topProducts) {
                    recommendationBreakdowns.push(...trace.output.topProducts);
                }
            } else if (trace.engine === "LEARNING") {
                title = "Implicit Learning";
                description = trace.output?.promotionTriggered ? "Promoted new memory." : "Logged implicit signals.";
            }

            timeline.push({
                stepIndex: i + 1,
                title,
                engine: trace.engine,
                description,
                durationMs: trace.durationMs,
                status: trace.status
            });
        }

        return {
            traceId,
            decisionId: traces[0]?.decisionId || "unknown",
            totalDurationMs,
            featureFlags: FeatureFlags as any,
            timeline,
            confidences,
            recommendationBreakdowns
        };
    }
}
