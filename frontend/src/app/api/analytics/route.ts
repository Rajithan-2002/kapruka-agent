import { NextResponse } from "next/server";
import { trackProductInteraction } from "@/lib/services/analyticsService";

export async function POST(request: Request) {
    try {
        const { userId, sessionId, productId, action } = await request.json();
        
        if (!productId || !action || !sessionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await trackProductInteraction(userId, sessionId, productId, action);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to log analytics" }, { status: 500 });
    }
}
