import { godModeStorage } from "./storage";

export class ReplayService {
    public static recordStep(stepName: string, inputSnapshot: any, outputSnapshot: any) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            store.replaySteps.push({
                stepName,
                timestamp: Date.now() - store.startTime,
                inputSnapshot,
                outputSnapshot
            });
        } catch (e) {
            console.error("GodMode telemetry error (recordStep):", e);
        }
    }
}
