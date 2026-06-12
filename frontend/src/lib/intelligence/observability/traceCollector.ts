import { BaseTrace, EngineTrace, EngineType } from "./types";
import { TraceStore } from "./traceStore";
import { PrivacyFilter } from "./privacyFilter";

export class TraceCollector {
    
    /**
     * Standardizes and saves a trace from any engine.
     * Enforces correlation IDs and applies Privacy Filters before saving.
     */
    public static async logExecution<TInput, TOutput>(
        traceId: string,
        decisionId: string,
        engine: EngineType,
        durationMs: number,
        input: TInput,
        output: TOutput,
        status: BaseTrace["status"] = "HEALTHY",
        errorCode?: string
    ) {
        // Sanitize PII
        const safeInput = PrivacyFilter.sanitize(input);
        const safeOutput = PrivacyFilter.sanitize(output);

        const trace: EngineTrace<typeof safeInput, typeof safeOutput> = {
            traceId,
            decisionId,
            engine,
            status,
            durationMs,
            timestamp: new Date(),
            input: safeInput,
            output: safeOutput,
            errorCode
        };

        // Push to Trace Store
        await TraceStore.saveTrace(traceId, trace);
        return trace;
    }
}
