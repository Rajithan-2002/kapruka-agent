export const FeatureFlags = {
    ENABLE_MEMORY_ENGINE: true,
    ENABLE_RULE_ENGINE: true,
    ENABLE_AFFINITY_ENGINE: true,
    ENABLE_RANKING_ENGINE: true,
    ENABLE_OBSERVABILITY_TRACING: true,
};

export type EngineHealthStatus = "healthy" | "degraded" | "disabled";

export interface EngineStatus {
    engine: string;
    status: EngineHealthStatus;
    reason?: string;
}
