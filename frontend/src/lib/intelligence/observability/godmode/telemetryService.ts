import { godModeStorage } from "./storage";
import { EngineHealth } from "./types";

export class GodTelemetryService {
    public static emit(
        engine: string,
        status: "RUNNING" | "COMPLETED" | "WAITING" | "ERROR",
        details?: any
    ) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            const now = Date.now();
            const timestamp = now - store.startTime;
            
            // Check if there was a corresponding RUNNING state to update duration
            if (status === "COMPLETED" || status === "ERROR") {
                // Find the last RUNNING event for this engine
                const runningEvents = store.telemetryEvents.filter(
                    e => e.engine === engine && e.status === "RUNNING"
                );
                if (runningEvents.length > 0) {
                    const lastRunning = runningEvents[runningEvents.length - 1];
                    lastRunning.durationMs = timestamp - lastRunning.timestamp;
                }
            }

            store.telemetryEvents.push({
                engine,
                status,
                timestamp,
                details
            });

            // Track engine health
            if (status === "ERROR") {
                store.engineHealth[engine] = "Error";
            } else if (status === "COMPLETED") {
                if (!store.engineHealth[engine] || store.engineHealth[engine] === "No Data") {
                    store.engineHealth[engine] = "Healthy";
                }
            }
        } catch (e) {
            console.error("GodMode telemetry error (emit):", e);
        }
    }

    public static healthCheck(engine: string, health: EngineHealth) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;
            store.engineHealth[engine] = health;
        } catch (e) {
            console.error("GodMode telemetry error (healthCheck):", e);
        }
    }
}
