export interface TelemetryEvent {
    engine: string;
    status: "RUNNING" | "COMPLETED" | "WAITING" | "ERROR" | "SKIPPED";
    durationMs?: number;
    timestamp: number; // millisecond offset from request start
    details?: any;
}

export interface ProductStage {
    stage: string;      // e.g. "RETRIEVED", "DEDUPLICATED", "HARD_FILTER", "SEMANTIC_FILTER", "COMMUNITY", "RANKED"
    status: "APPROVED" | "REJECTED" | "PENALIZED";
    reason?: string;
    timestamp: number;  // offset offset from request start
}

export interface ProductLifecycle {
    productId: string;
    productName: string;
    url?: string;
    stages: ProductStage[];
}

export interface ReplayStep {
    stepName: string;
    timestamp: number;
    inputSnapshot: any;
    outputSnapshot: any;
}

export interface SessionSummary {
    intent: string;
    recipient: string;
    occasion: string;
    budget: number | null;
    evaluatedCount: number;
    filteredCount: number;
    winningProductId: string | null;
    winningProductName: string | null;
    confidence: number;
    durationMs: number;
}

export type EngineHealth = "Healthy" | "Degraded" | "No Data" | "Error";

export interface GodModeContext {
    traceId: string;
    userId: string;
    enabled: boolean;
    telemetryEvents: TelemetryEvent[];
    productLifecycles: Record<string, ProductLifecycle>; // Keyed by product ID (compressed)
    replaySteps: ReplayStep[];
    confidenceFactors: { positive: string[]; negative: string[] };
    sessionSummary: Partial<SessionSummary>;
    engineHealth: Record<string, EngineHealth>;
    startTime: number;
}
