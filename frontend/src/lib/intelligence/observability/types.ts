export type EngineType = "MEMORY" | "RULE" | "RANKING" | "AFFINITY" | "LEARNING" | "UNDERSTANDING" | "ORCHESTRATOR";
export type EngineStatus = "HEALTHY" | "DEGRADED" | "ERROR";

export interface BaseTrace {
    traceId: string;
    decisionId: string;
    engine: EngineType;
    status: EngineStatus;
    durationMs: number;
    timestamp: Date;
    errorCode?: string;
    errorDetails?: string;
}

export interface EngineTrace<TInput, TOutput> extends BaseTrace {
    input: TInput;
    output: TOutput;
}

// Frontend Judge Compressed Formats
export interface TimelineEvent {
    stepIndex: number;
    title: string;
    engine: EngineType;
    description: string;
    durationMs: number;
    status: EngineStatus;
}

export interface JudgePayload {
    traceId: string;
    decisionId: string;
    totalDurationMs: number;
    featureFlags: Record<string, boolean>;
    timeline: TimelineEvent[];
    confidences: {
        intent: number;
        memory: number;
        recommendation: number;
    };
    recommendationBreakdowns: Array<{
        productName: string;
        scores: Record<string, number>;
        finalScore: number;
    }>;
}
