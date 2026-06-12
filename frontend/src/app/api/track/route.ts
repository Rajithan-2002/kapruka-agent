import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackProductAction } from "@/lib/services/purchaseHistoryService";
import { updateAfterPurchase } from "@/lib/services/behaviorProfileService";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";

        const { product, action, sessionContext } = await request.json();

        if (!product || !action) {
            return NextResponse.json({ error: "Missing product or action" }, { status: 400 });
        }

        // Track standard actions in purchase history
        const standardActions = ["viewed", "purchased", "reordered", "added_to_bundle"];
        if (standardActions.includes(action)) {
            await trackProductAction(userId, product, action as any, sessionContext);
        }

        // If purchased or reordered, update behavior profile stats
        if (action === "purchased" || action === "reordered") {
            await updateAfterPurchase(userId, {
                category: product.category || "General",
                price: product.price
            });
        }

        // Log community analytics using active session snapshot variables
        const sessionId = sessionContext?.sessionId;
        let recipient: string | null = null;
        let occasion: string | null = null;
        let budget: string | null = null;

        if (sessionId) {
            try {
                const { SessionSnapshotEngine } = await import("@/lib/intelligence/state/sessionSnapshot");
                const snapshot = await SessionSnapshotEngine.loadSnapshot(sessionId);
                if (snapshot) {
                    recipient = snapshot.recipient || null;
                    occasion = snapshot.occasion || null;
                    if (snapshot.budget) {
                        const amt = typeof snapshot.budget === "number" ? snapshot.budget : parseFloat(snapshot.budget);
                        if (!isNaN(amt)) {
                            budget = amt <= 3000 ? "BUDGET" : amt <= 10000 ? "MID" : amt <= 50000 ? "PREMIUM" : "LUXURY";
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading session snapshot in tracking API:", err);
            }
        }

        const mappedAction = action === "viewed" || action === "view"
            ? "view"
            : action === "expand"
            ? "expand"
            : action === "added_to_bundle" || action === "bundle_add"
            ? "bundle_add"
            : (action === "purchased" || action === "reordered" || action === "purchase")
            ? "purchase"
            : null;

        if (mappedAction) {
            const { logCommunityAction } = await import("@/lib/intelligence/feedback/feedbackService");
            await logCommunityAction(
                userId,
                product.id || product.productId,
                mappedAction,
                recipient || sessionContext?.recipientName || null,
                occasion || null,
                budget
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Tracking API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

