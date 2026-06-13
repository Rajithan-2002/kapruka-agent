import { godModeStorage } from "./storage";

export class ProductAuditService {
    public static initProduct(productId: string, productName: string) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            if (!store.productLifecycles[productId]) {
                store.productLifecycles[productId] = {
                    productId,
                    productName,
                    stages: []
                };
            }
        } catch (e) {
            console.error("GodMode telemetry error (initProduct):", e);
        }
    }

    public static transition(
        productId: string,
        productName: string,
        stage: string,
        status: "APPROVED" | "REJECTED" | "PENALIZED",
        reason?: string
    ) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            this.initProduct(productId, productName);
            
            const timestamp = Date.now() - store.startTime;
            store.productLifecycles[productId].stages.push({
                stage,
                status,
                reason,
                timestamp
            });
        } catch (e) {
            console.error("GodMode telemetry error (transition):", e);
        }
    }
}
