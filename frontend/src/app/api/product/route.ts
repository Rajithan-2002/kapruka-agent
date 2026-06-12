import { NextResponse } from "next/server";
import { mcpGetProduct } from "@/lib/mcp";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");
        
        if (!productId) {
            return NextResponse.json({ error: "Missing productId parameter" }, { status: 400 });
        }
        
        const details = await mcpGetProduct(productId);
        if (!details) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        
        return NextResponse.json({ product: details });
    } catch (error: any) {
        console.error("Error in /api/product:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch product details" }, { status: 500 });
    }
}
