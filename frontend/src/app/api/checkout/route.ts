import { NextResponse } from "next/server";
import { mcpCreateOrder } from "@/lib/mcp";
import { addOrder } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        console.log("[Checkout API] Received checkout payload:", JSON.stringify(payload, null, 2));

        // Create order via MCP with automatic retry for rate limits
        let result;
        let maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                result = await mcpCreateOrder(payload);
                if (!result || !result.checkout_url) {
                    throw new Error("Missing checkout_url in MCP response");
                }
                break; // Success, exit retry loop
            } catch (err: any) {
                if (err.message?.includes("Rate limit") && attempt < maxRetries - 1) {
                    console.log(`[Checkout API] Rate limit hit. Retrying attempt ${attempt + 1} of ${maxRetries}...`);
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // Exponential backoff: 2s, 4s
                    attempt++;
                } else {
                    throw err; // Not a rate limit or out of retries
                }
            }
        }

        console.log("[Checkout API] MCP Order created successfully:", result);

        // Save the order to Kappy Database (Supabase/local JSON)
        try {
            const orderItems = payload.cart.map((item: any) => `Product ID: ${item.product_id} (Qty: ${item.quantity || 1})`);
            await addOrder({
                orderNumber: result.order_ref,
                recipientName: payload.recipient?.name || "Recipient",
                totalAmount: result.summary?.grand_total || result.summary?.items_total || 0,
                items: orderItems
            });
            console.log("[Checkout API] Order logged to Kappy database.");
        } catch (dbErr) {
            console.error("[Checkout API] Warning: Failed to log order to database:", dbErr);
            // Non-blocking, return success response even if DB logging failed
        }

        return NextResponse.json({
            success: true,
            checkout_url: result.checkout_url,
            order_ref: result.order_ref,
            summary: result.summary
        });

    } catch (error: any) {
        console.error("[Checkout API] Exception during checkout:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Unknown error during checkout."
        }, { status: 500 });
    }
}
