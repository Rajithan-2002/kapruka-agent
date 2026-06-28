export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/services/memoryService";
import { getBehaviorProfile } from "@/lib/services/behaviorProfileService";
import { mcpSearchProducts, MCPProduct } from "@/lib/mcp";
import { OccasionEngine } from "@/lib/occasionEngine";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId") || "";

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const isAnonymous = !user || userId === "00000000-0000-0000-0000-000000000000";

        // Load active occasions for seasonality scoring
        const activeOccasions = OccasionEngine.getActiveOccasions();
        const activeOccasionNames = activeOccasions.map(o => o.name.toLowerCase());

        let productsPool: Array<MCPProduct & { sourceCategory: string }> = [];

        if (isAnonymous) {
            // ------------------------------------------------------------
            // ANONYMOUS GUEST USER STRATEGY
            // ------------------------------------------------------------
            
            let sessionInteractions: Record<string, number> = {};
            if (sessionId) {
                try {
                    const { AnonymousSessionService } = await import("@/lib/services/anonymousSessionService");
                    const session = AnonymousSessionService.getSession(sessionId);
                    sessionInteractions = session.categoryInteractions || {};
                } catch (err) {
                    console.error("Failed to load anonymous session:", err);
                }
            }

            const categoryWeights: Record<string, number> = {
                "ELECTRONICS": 35,
                "GROCERY": 20,
                "HOUSEHOLD": 15,
                "LIFESTYLE": 10,
                "POPULAR_GIFTS": 10,
                "TRENDING": 10
            };

            Object.entries(sessionInteractions).forEach(([cat, clicks]) => {
                const normalizedCat = cat.replace(/\s+/g, "_").toUpperCase();
                if (categoryWeights[normalizedCat] !== undefined) {
                    categoryWeights[normalizedCat] += clicks * 15; 
                }
            });

            const excludedCategories = ["cakes", "flowers", "fashion", "cosmetics"];
            const isExcluded = (pName: string, pCat: string) => {
                const nameLower = pName.toLowerCase();
                const catLower = pCat.toLowerCase();
                return excludedCategories.some(exc => {
                    const clickCount = sessionInteractions[exc.toUpperCase()] || 0;
                    if (clickCount > 0) return false;
                    return nameLower.includes(exc) || catLower.includes(exc);
                });
            };

            const categoriesToFetch = [
                { query: "electronics", source: "ELECTRONICS" },
                { query: "grocery", source: "GROCERY" },
                { query: "household appliances kitchen", source: "HOUSEHOLD" },
                { query: "lifestyle", source: "LIFESTYLE" },
                { query: "hamper bouquet chocolate combo", source: "POPULAR_GIFTS" },
                { query: "popular", source: "TRENDING" }
            ];

            const fetchedResults = [];
            for (const cat of categoriesToFetch) {
                try {
                    const res = await mcpSearchProducts(cat.query, 15);
                    fetchedResults.push(res.map(p => ({ ...p, sourceCategory: cat.source })));
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.error("Failed to fetch landing category", cat.query, e);
                }
            }
            const rawPool = fetchedResults.flat().sort(() => Math.random() - 0.5);

            const filteredPool = rawPool.filter(p => {
                if (!p.in_stock) return false;
                const name = p.name || "";
                const category = p.category?.name || "";
                return !isExcluded(name, category);
            });

            const scoredPool = filteredPool.map(p => {
                const name = p.name.toLowerCase();
                const category = (p.category?.name || "").toLowerCase();
                const sourceCat = p.sourceCategory;
                
                const popularity = p.rating ? p.rating * 0.1 : 0.4;
                
                let inventoryScore = 0.3;
                if (p.stock_level === "high" || p.stock_level === "medium") {
                    inventoryScore = 0.5;
                }

                let seasonalityBoost = 0;
                if (activeOccasionNames.some(occ => name.includes(occ) || category.includes(occ))) {
                    seasonalityBoost = 1.0;
                }

                const catWeight = categoryWeights[sourceCat] || 10;
                const score = (catWeight * 0.1) + popularity + inventoryScore + seasonalityBoost;

                return { product: p, score };
            });

            scoredPool.sort((a, b) => b.score - a.score);
            productsPool = scoredPool.map(s => s.product);

        } else {
            // ------------------------------------------------------------
            // LOGGED-IN REGISTERED USER STRATEGY
            // ------------------------------------------------------------
            
            const [preferences, behaviorProfile, purchaseHistory] = await Promise.all([
                getPreferences(userId).catch(() => []),
                getBehaviorProfile(userId).catch(() => null),
                Promise.resolve(supabase.from("orders").select("items").eq("user_id", userId)).catch(() => ({ data: [] }))
            ]);

            const interests = preferences
                .map((p: any) => p.interest)
                .filter(Boolean)
                .map((i: any) => i.toLowerCase().trim());

            const historyItems = (purchaseHistory as any)?.data || [];
            const purchasedCategories = new Set<string>();
            historyItems.forEach((order: any) => {
                (order.items || []).forEach((item: string) => {
                    const itemLower = item.toLowerCase();
                    if (itemLower.includes("cake")) purchasedCategories.add("cakes");
                    if (itemLower.includes("flower") || itemLower.includes("rose")) purchasedCategories.add("flowers");
                    if (itemLower.includes("hamper")) purchasedCategories.add("popular_gifts");
                    if (itemLower.includes("mug") || itemLower.includes("home")) purchasedCategories.add("household");
                    if (itemLower.includes("phone") || itemLower.includes("electronics")) purchasedCategories.add("electronics");
                });
            });

            const favoriteCategories = behaviorProfile?.favorite_categories || [];

            const queries = new Set<string>(["popular", "hamper"]);
            favoriteCategories.forEach((c: any) => queries.add(c.toLowerCase()));
            interests.forEach((i: any) => queries.add(i));

            const mcpResults = [];
            for (const q of Array.from(queries)) {
                try {
                    const res = await mcpSearchProducts(q, 10);
                    mcpResults.push(res.map(p => ({ ...p, sourceCategory: q.toUpperCase() })));
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.error("Failed to fetch landing category", q, e);
                }
            }
            const rawPool = mcpResults.flat();

            const scoredPool = rawPool.filter(p => p.in_stock).map(p => {
                const name = p.name.toLowerCase();
                const category = (p.category?.name || "").toLowerCase();
                const priceAmount = p.price?.amount || 0;

                let score = 0;

                const hasPrefMatch = interests.some((interest: any) => name.includes(interest) || category.includes(interest));
                if (hasPrefMatch) score += 2.0;

                const hasHistoryMatch = Array.from(purchasedCategories).some(cat => category.includes(cat.toLowerCase()));
                if (hasHistoryMatch) score += 1.5;

                if (behaviorProfile?.favorite_price_range) {
                    const { min, max } = behaviorProfile.favorite_price_range;
                    if (min > 0 && max > 0 && priceAmount >= min && priceAmount <= max) {
                        score += 1.0;
                    }
                }

                let seasonalityBoost = 0;
                if (activeOccasionNames.some(occ => name.includes(occ) || category.includes(occ))) {
                    seasonalityBoost = 1.5;
                }
                score += seasonalityBoost;

                score += p.rating ? p.rating * 0.2 : 0.5;

                return { product: p, score };
            });

            scoredPool.sort((a, b) => b.score - a.score);
            productsPool = scoredPool.map(s => s.product);
        }

        const finalSelected: any[] = [];
        const seenCategories = new Set<string>();
        const categoryCounts: Record<string, number> = {};
        const brandCounts: Record<string, number> = {};

        const getBrand = (name: string) => {
            return name.trim().split(/\s+/)[0].toLowerCase();
        };

        for (const p of productsPool) {
            const cat = (p.category?.name || p.sourceCategory || "General").toUpperCase();
            const brand = getBrand(p.name);

            const catCount = categoryCounts[cat] || 0;
            const brandCount = brandCounts[brand] || 0;

            if (catCount < 2 && brandCount < 2) {
                finalSelected.push(p);
                categoryCounts[cat] = catCount + 1;
                brandCounts[brand] = brandCount + 1;
                seenCategories.add(cat);
            }
        }

        const popularBundlesRaw = finalSelected.filter(p => {
            const name = p.name.toLowerCase();
            const cat = (p.category?.name || p.sourceCategory || "").toLowerCase();
            return name.includes("hamper") || 
                   name.includes("basket") || 
                   name.includes("bundle") || 
                   name.includes("combo") || 
                   name.includes("gift set") || 
                   name.includes("bouquet") || 
                   cat.includes("gift") || 
                   cat.includes("hamper") || 
                   p.sourceCategory === "POPULAR_GIFTS";
        });

        const fastDeliveryRaw = finalSelected.filter(p => !popularBundlesRaw.includes(p));

        let popularBundlesMapped = popularBundlesRaw.map(p => ({
            id: p.id || `bundle-${p.name}`,
            name: p.name,
            price: p.price?.amount || p.price || 5000,
            image: p.image_url || p.imageUrl || p.image || "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80",
            url: p.url || "",
            tag: p.summary || p.category?.name || "Kapruka Gift Pack"
        }));

        let fastDeliveryMapped = fastDeliveryRaw.map(p => ({
            id: p.id || `fast-${p.name}`,
            name: p.name,
            price: p.price?.amount || p.price || 3000,
            image: p.image_url || p.imageUrl || p.image || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80",
            url: p.url || ""
        }));

        const popularBundles = popularBundlesMapped.sort(() => Math.random() - 0.5).slice(0, 5);
        const fastDelivery = fastDeliveryMapped.sort(() => Math.random() - 0.5).slice(0, 6);

        return new NextResponse(
            JSON.stringify({ popularBundles, fastDelivery }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            }
        );
    } catch (error: any) {
        console.error("Landing Products API exception:", error);
        
        return new NextResponse(
            JSON.stringify({ popularBundles: [], fastDelivery: [] }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            }
        );
    }
}
