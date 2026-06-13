import { EngineTrace } from "./types";
import { createClient } from "@/lib/supabase/server";

export class TraceStore {
    // MVP: In-memory store. In production, this pushes to a fast NoSQL or Supabase with a 30-day TTL.
    private static store = new Map<string, { traceId: string; traces: EngineTrace<any, any>[] }>();

    public static async saveTrace(traceId: string, trace: EngineTrace<any, any>) {
        // Memory Leak Protection: Cap fallback trace cache to 200 traces using FIFO eviction
        if (this.store.size >= 200 && !this.store.has(traceId)) {
            const oldestTraceId = this.store.keys().next().value;
            if (oldestTraceId) {
                this.store.delete(oldestTraceId);
            }
        }
        const existing = this.store.get(traceId) || { traceId, traces: [] };
        existing.traces.push(trace);
        this.store.set(traceId, existing);

        try {
            const supabase = await createClient();
            await supabase.from("intelligence_traces").insert({
                trace_id: traceId,
                decision_id: trace.decisionId,
                engine: trace.engine,
                status: trace.status,
                duration_ms: trace.durationMs,
                input_snapshot: trace.input,
                output_snapshot: trace.output,
                error_code: trace.errorCode
            });
        } catch (error) {
            console.error("Failed to persist trace:", error);
        }
    }

    public static async getTraces(traceId: string): Promise<EngineTrace<any, any>[]> {
        return this.store.get(traceId)?.traces || [];
    }

    public static async replayDecision(traceId: string) {
        // Framework hook for future Replay Engine
        const traces = await this.getTraces(traceId);
        console.log(`[Replay Engine] Replaying trace ${traceId} with ${traces.length} steps...`);
        return traces;
    }
}
