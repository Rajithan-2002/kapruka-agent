import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackProductAction } from "@/lib/services/purchaseHistoryService";
import { updateAfterPurchase } from "@/lib/services/behaviorProfileService";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.id;

        const { product, action, sessionContext } = await request.json();

        if (!product || !action) {
            return NextResponse.json({ error: "Missing product or action" }, { status: 400 });
        }

        // Track the action in purchase history
        await trackProductAction(userId, product, action, sessionContext);

        // If purchased or reordered, update behavior profile stats
        if (action === "purchased" || action === "reordered") {
            await updateAfterPurchase(userId, {
                category: product.category || "General",
                price: product.price
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Tracking API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
