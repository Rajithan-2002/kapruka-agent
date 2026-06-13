import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/services/memoryService";
import { mcpSearchProducts } from "@/lib/mcp";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";

        // 1. Fetch preferences for personalization context
        const preferences = await getPreferences(userId).catch(() => []);
        const interests = preferences
            .map(p => p.interest)
            .filter(Boolean)
            .map(i => i.toLowerCase().trim());

        // 2. Select query terms based on preferences
        let bundleQuery = "hamper";
        let fastQuery1 = "cake";
        let fastQuery2 = "roses";

        if (interests.length > 0) {
            // Find a suitable interest term to customize search
            const topInterest = interests[0];
            if (topInterest.includes("chocolate")) {
                bundleQuery = "chocolate hamper";
                fastQuery1 = "chocolate cake";
                fastQuery2 = "ferrero";
            } else if (topInterest.includes("flower") || topInterest.includes("rose") || topInterest.includes("pink")) {
                bundleQuery = "flower hamper";
                fastQuery1 = "fresh roses";
                fastQuery2 = "tulips";
            } else if (topInterest.includes("toy") || topInterest.includes("teddy") || topInterest.includes("baby")) {
                bundleQuery = "toy hamper";
                fastQuery1 = "soft toy";
                fastQuery2 = "kids cake";
            } else if (topInterest.includes("tech") || topInterest.includes("gadget") || topInterest.includes("men")) {
                bundleQuery = "men hamper";
                fastQuery1 = "mug";
                fastQuery2 = "perfume";
            } else {
                bundleQuery = `${topInterest} hamper`;
                fastQuery1 = topInterest;
            }
        }

        // 3. Query Kapruka MCP Server
        console.log(`[Landing API] Personalized Queries - Bundles: "${bundleQuery}", Fast: "${fastQuery1}", "${fastQuery2}"`);
        
        let bundleProducts = await mcpSearchProducts(bundleQuery, 10).catch(() => []);
        if (bundleProducts.length === 0 && bundleQuery !== "hamper") {
            bundleProducts = await mcpSearchProducts("hamper", 10).catch(() => []);
        }

        let fastProducts1 = await mcpSearchProducts(fastQuery1, 10).catch(() => []);
        let fastProducts2 = await mcpSearchProducts(fastQuery2, 10).catch(() => []);
        
        // Combine fast items
        let combinedFast = [...fastProducts1, ...fastProducts2];
        if (combinedFast.length === 0) {
            // Fallback to defaults if empty
            const defCakes = await mcpSearchProducts("cake", 5).catch(() => []);
            const defFlowers = await mcpSearchProducts("roses", 5).catch(() => []);
            combinedFast = [...defCakes, ...defFlowers];
        }

        // Remove duplicates by ID
        const seenIds = new Set<string>();
        const uniqueBundles = bundleProducts.filter(p => {
            const id = p.id || p.url;
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        const seenFastIds = new Set<string>();
        const uniqueFast = combinedFast.filter(p => {
            const id = p.id || p.url;
            if (!id || seenFastIds.has(id)) return false;
            seenFastIds.add(id);
            return true;
        });

        // 4. Map to UI structures
        const popularBundles = uniqueBundles.slice(0, 3).map(p => ({
            id: p.id || `bundle-${p.name}`,
            name: p.name,
            price: p.price?.amount || 5000,
            image: p.image_url || "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80",
            url: p.url || "",
            tag: p.summary || p.category?.name || "Kapruka Gift Pack"
        }));

        const fastDelivery = uniqueFast.slice(0, 4).map((p, idx) => ({
            id: p.id || `fast-${p.name}`,
            name: p.name,
            price: p.price?.amount || 3000,
            image: p.image_url || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80",
            url: p.url || ""
        }));

        return NextResponse.json({
            popularBundles,
            fastDelivery
        });
    } catch (error: any) {
        console.error("Landing Products API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
