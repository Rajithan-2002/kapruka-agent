import { NextResponse } from "next/server";
import { mcpCreateOrder } from "@/lib/mcp";
import { addOrder } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        console.log("[Checkout API] Received checkout payload:", JSON.stringify(payload, null, 2));

        // Intercept mock products for seamless UI demo
        const hasMockIds = payload.cart?.some((item: any) => 
            ['roses', 'chocs', 'card'].includes(item.product_id) || 
            item.product_id.startsWith('mock-') ||
            item.product_id.startsWith('landing-')
        );

        if (hasMockIds) {
            console.log("[Checkout API] Mock products detected. Returning mock checkout URL.");
            return NextResponse.json({
                success: true,
                checkout_url: "https://www.kapruka.com/checkout/demo-payment-link",
                order_ref: `DEMO-${Math.floor(Math.random() * 100000)}`,
                summary: {
                    items_total: 4500,
                    delivery_fee: 300,
                    grand_total: 4800
                }
            });
        }

        // Create order via MCP
        const result = await mcpCreateOrder(payload);
        if (!result || !result.checkout_url) {
            console.error("[Checkout API] Failed to create order via MCP. Result:", result);
            return NextResponse.json({
                success: false,
                error: "Failed to create order on Kapruka MCP server."
            }, { status: 500 });
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
