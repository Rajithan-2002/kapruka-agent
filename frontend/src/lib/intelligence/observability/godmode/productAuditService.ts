import { godModeStorage } from "./storage";

export class ProductAuditService {
    public static initProduct(productId: string, productName: string, productUrl?: string) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            if (!store.productLifecycles[productId]) {
                store.productLifecycles[productId] = {
                    productId,
                    productName,
                    url: productUrl,
                    stages: []
                };
            } else if (productUrl && !store.productLifecycles[productId].url) {
                store.productLifecycles[productId].url = productUrl;
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
        reason?: string,
        productUrl?: string
    ) {
        try {
            const store = godModeStorage.getStore();
            if (!store || !store.enabled) return;

            this.initProduct(productId, productName, productUrl);
            
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
