export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/services/memoryService";
import { getBehaviorProfile } from "@/lib/services/behaviorProfileService";
import { mcpSearchProducts, MCPProduct } from "@/lib/mcp";
import { OccasionEngine } from "@/lib/occasionEngine";

const EMERGENCY_FALLBACK_CATALOG = [
    // Electronics
    {
        id: "fall-elec-1",
        name: "Kapruka Smart Charging Hub 5-Port USB",
        price: 2450,
        image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80",
        category: "Electronics",
        tag: "Electronics",
        brand: "Kapruka"
    },
    {
        id: "fall-elec-2",
        name: "Premium Wireless Bluetooth Earbuds",
        price: 3950,
        image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
        category: "Electronics",
        tag: "Electronics",
        brand: "Sony"
    },
    {
        id: "fall-elec-3",
        name: "Kapruka 10000mAh Slim Power Bank",
        price: 2950,
        image: "https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?w=400&q=80",
        category: "Electronics",
        tag: "Electronics",
        brand: "Kapruka"
    },
    // Grocery
    {
        id: "fall-groc-1",
        name: "Pure Ceylon Premium Tea Gift Box",
        price: 1850,
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80",
        category: "Grocery",
        tag: "Grocery",
        brand: "Dilmah"
    },
    {
        id: "fall-groc-2",
        name: "Kapruka Assorted Biscuits Celebration Tin",
        price: 1250,
        image: "https://images.unsplash.com/photo-1558961303-1d20210a2e41?w=400&q=80",
        category: "Grocery",
        tag: "Grocery",
        brand: "Kapruka"
    },
    {
        id: "fall-groc-3",
        name: "Premium Roasted Cashews Pack 250g",
        price: 1650,
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
        category: "Grocery",
        tag: "Grocery",
        brand: "Kapruka"
    },
    // Household & Appliances
    {
        id: "fall-house-1",
        name: "Handcrafted Ceramic Mug Set (2 Pcs)",
        price: 2150,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80",
        category: "Household",
        tag: "Household",
        brand: "Clayco"
    },
    {
        id: "fall-house-2",
        name: "Aromatic Reed Diffuser - Lavender & Jasmine",
        price: 3100,
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80",
        category: "Household",
        tag: "Household",
        brand: "Aroma"
    },
    {
        id: "fall-house-3",
        name: "Panasonic 1.8L Rice Cooker",
        price: 9800,
        image: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&q=80",
        category: "Household",
        tag: "Appliances",
        brand: "Panasonic"
    },
    {
        id: "fall-house-4",
        name: "Philips Daily Collection Blender",
        price: 8900,
        image: "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=400&q=80",
        category: "Household",
        tag: "Appliances",
        brand: "Philips"
    },
    // Lifestyle
    {
        id: "fall-life-1",
        name: "Genuine Leather Slim Wallet",
        price: 4500,
        image: "https://images.unsplash.com/photo-1627124765135-5653d9354ab5?w=400&q=80",
        category: "Lifestyle",
        tag: "Lifestyle",
        brand: "Leathco"
    },
    {
        id: "fall-life-2",
        name: "Ocean Breeze Eau De Toilette For Men",
        price: 8500,
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80",
        category: "Lifestyle",
        tag: "Lifestyle",
        brand: "Ocean"
    },
    // Popular Gifts (Bundles, Bouquets, Chocolates, Combos)
    {
        id: "fall-gift-1",
        name: "Kapruka Classic Tea & Cookies Hamper",
        price: 6800,
        image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80",
        category: "Popular Gifts",
        tag: "Kapruka Gift Pack",
        brand: "Kapruka"
    },
    {
        id: "fall-gift-2",
        name: "Deluxe Chocolate & Nuts Gift Basket",
        price: 9500,
        image: "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400&q=80",
        category: "Popular Gifts",
        tag: "Kapruka Gift Pack",
        brand: "Kapruka"
    },
    {
        id: "fall-gift-3",
        name: "Premium Red Rose Bouquet & Chocolates",
        price: 4500,
        image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80",
        category: "Popular Gifts",
        tag: "Flower Bouquet",
        brand: "Kapruka"
    },
    {
        id: "fall-gift-4",
        name: "Kapruka Chocolate Lovers Dream Bundle",
        price: 5800,
        image: "https://images.unsplash.com/photo-1548907040-4d42b5212ecb?w=400&q=80",
        category: "Popular Gifts",
        tag: "Chocolate Bundle",
        brand: "Kapruka"
    },
    {
        id: "fall-gift-5",
        name: "Celebration Fruit & Flower Combo Gift",
        price: 7200,
        image: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&q=80",
        category: "Popular Gifts",
        tag: "Combo Bundle",
        brand: "Kapruka"
    }
];

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
            
            // 1. Load Session interactions (in-memory learning)
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

            // Define base category weights
            const categoryWeights: Record<string, number> = {
                "ELECTRONICS": 35,
                "GROCERY": 20,
                "HOUSEHOLD": 15,
                "LIFESTYLE": 10,
                "POPULAR_GIFTS": 10,
                "TRENDING": 10
            };

            // Boost category weights based on active session interactions
            Object.entries(sessionInteractions).forEach(([cat, clicks]) => {
                const normalizedCat = cat.replace(/\s+/g, "_").toUpperCase();
                if (categoryWeights[normalizedCat] !== undefined) {
                    categoryWeights[normalizedCat] += clicks * 15; // Shift weights towards clicked categories
                }
            });

            // Avoid cakes, flowers, cosmetics, fashion for guests unless clicked in session
            const excludedCategories = ["cakes", "flowers", "fashion", "cosmetics"];
            const isExcluded = (pName: string, pCat: string) => {
                const nameLower = pName.toLowerCase();
                const catLower = pCat.toLowerCase();
                return excludedCategories.some(exc => {
                    const clickCount = sessionInteractions[exc.toUpperCase()] || 0;
                    if (clickCount > 0) return false; // Allowed because of session interest
                    return nameLower.includes(exc) || catLower.includes(exc);
                });
            };

            // 2. Fetch candidates from MCP for each category
            const fetchPromises = [
                mcpSearchProducts("electronics", 15).then(res => res.map(p => ({ ...p, sourceCategory: "ELECTRONICS" }))),
                mcpSearchProducts("grocery", 15).then(res => res.map(p => ({ ...p, sourceCategory: "GROCERY" }))),
                mcpSearchProducts("household appliances kitchen", 15).then(res => res.map(p => ({ ...p, sourceCategory: "HOUSEHOLD" }))),
                mcpSearchProducts("lifestyle", 15).then(res => res.map(p => ({ ...p, sourceCategory: "LIFESTYLE" }))),
                mcpSearchProducts("hamper bouquet chocolate combo", 15).then(res => res.map(p => ({ ...p, sourceCategory: "POPULAR_GIFTS" }))),
                mcpSearchProducts("popular", 15).then(res => res.map(p => ({ ...p, sourceCategory: "TRENDING" })))
            ];

            const fetchedResults = await Promise.all(fetchPromises).catch(() => [[], [], [], [], [], []]);
            // Randomly shuffle raw candidates to ensure refresh rotation
            const rawPool = fetchedResults.flat().sort(() => Math.random() - 0.5);

            // Filter exclusions and keep only in-stock
            const filteredPool = rawPool.filter(p => {
                if (!p.in_stock) return false;
                const name = p.name || "";
                const category = p.category?.name || "";
                return !isExcluded(name, category);
            });

            // Score products using Popularity + Inventory Health + Seasonality
            const scoredPool = filteredPool.map(p => {
                const name = p.name.toLowerCase();
                const category = (p.category?.name || "").toLowerCase();
                const sourceCat = p.sourceCategory;
                
                // Popularity (mock score + rating factor)
                const popularity = p.rating ? p.rating * 0.1 : 0.4;
                
                // Inventory Health (boost high stock levels)
                let inventoryScore = 0.3;
                if (p.stock_level === "high" || p.stock_level === "medium") {
                    inventoryScore = 0.5;
                }

                // Seasonality boost if product matches dynamic occasion names
                let seasonalityBoost = 0;
                if (activeOccasionNames.some(occ => name.includes(occ) || category.includes(occ))) {
                    seasonalityBoost = 1.0;
                }

                const catWeight = categoryWeights[sourceCat] || 10;

                const score = (catWeight * 0.1) + popularity + inventoryScore + seasonalityBoost;

                return {
                    product: p,
                    score
                };
            });

            // Sort by score descending
            scoredPool.sort((a, b) => b.score - a.score);
            productsPool = scoredPool.map(s => s.product);

        } else {
            // ------------------------------------------------------------
            // LOGGED-IN REGISTERED USER STRATEGY
            // ------------------------------------------------------------
            
            // 1. Retrieve user data from Supabase
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
                // Approximate categories from purchase descriptions or tags
                (order.items || []).forEach((item: string) => {
                    const itemLower = item.toLowerCase();
                    if (itemLower.includes("cake")) purchasedCategories.add("cakes");
                    if (itemLower.includes("flower") || itemLower.includes("rose")) purchasedCategories.add("flowers");
                    if (itemLower.includes("hamper")) purchasedCategories.add("popular_gifts");
                    if (itemLower.includes("mug") || itemLower.includes("home")) purchasedCategories.add("household");
                    if (itemLower.includes("phone") || itemLower.includes("electronics")) purchasedCategories.add("electronics");
                });
            });

            // Retrieve favorite categories from behavior profile
            const favoriteCategories = behaviorProfile?.favorite_categories || [];

            // 2. Query MCP for personalized categories
            const queries = new Set<string>(["popular", "hamper"]);
            favoriteCategories.forEach((c: any) => queries.add(c.toLowerCase()));
            interests.forEach((i: any) => queries.add(i));

            const mcpPromises = Array.from(queries).map(q => 
                mcpSearchProducts(q, 10).then(res => res.map(p => ({ ...p, sourceCategory: q.toUpperCase() })))
            );
            const mcpResults = await Promise.all(mcpPromises).catch(() => []);
            const rawPool = mcpResults.flat();

            // 3. Score using Preference Match + Purchase History + Behavior Score + Seasonality + Popularity
            const scoredPool = rawPool.filter(p => p.in_stock).map(p => {
                const name = p.name.toLowerCase();
                const category = (p.category?.name || "").toLowerCase();
                const priceAmount = p.price?.amount || 0;

                let score = 0;

                // Preference Match
                const hasPrefMatch = interests.some((interest: any) => name.includes(interest) || category.includes(interest));
                if (hasPrefMatch) score += 2.0;

                // Purchase History Match
                const hasHistoryMatch = Array.from(purchasedCategories).some(cat => category.includes(cat.toLowerCase()));
                if (hasHistoryMatch) score += 1.5;

                // Behavior Score (Price suitability)
                if (behaviorProfile?.favorite_price_range) {
                    const { min, max } = behaviorProfile.favorite_price_range;
                    if (min > 0 && max > 0 && priceAmount >= min && priceAmount <= max) {
                        score += 1.0;
                    }
                }

                // Seasonality match
                let seasonalityBoost = 0;
                if (activeOccasionNames.some(occ => name.includes(occ) || category.includes(occ))) {
                    seasonalityBoost = 1.5;
                }
                score += seasonalityBoost;

                // Popularity (Rating)
                score += p.rating ? p.rating * 0.2 : 0.5;

                return {
                    product: p,
                    score
                };
            });

            scoredPool.sort((a, b) => b.score - a.score);
            productsPool = scoredPool.map(s => s.product);
        }

        // ------------------------------------------------------------
        // DIVERSITY PROTECTION & SELECTION
        // - Minimum 5 categories
        // - Max 2 products per category
        // - Max 2 products per brand/vendor
        // ------------------------------------------------------------
        const finalSelected: any[] = [];
        const seenCategories = new Set<string>();
        const categoryCounts: Record<string, number> = {};
        const brandCounts: Record<string, number> = {};

        // Helper to extract brand (first word of product name)
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

        // If selection is too small or lacks 5 distinct categories, backfill with fallback catalog
        const uniqueCategoryList = Array.from(seenCategories);
        if (finalSelected.length < 10 || uniqueCategoryList.length < 5) {
            console.log(`[Landing API] Triggering Emergency Fallback. Selected: ${finalSelected.length}, Categories: ${uniqueCategoryList.length}`);
            
            // Loop through fallback catalog to backfill
            for (const fallback of EMERGENCY_FALLBACK_CATALOG) {
                const cat = fallback.category.toUpperCase();
                const brand = fallback.brand.toLowerCase();
                const alreadySelected = finalSelected.some(f => f.id === fallback.id || f.name === fallback.name);
                
                if (!alreadySelected) {
                    const catCount = categoryCounts[cat] || 0;
                    const brandCount = brandCounts[brand] || 0;
                    
                    // Relax restrictions during fallback to ensure we hit at least 10 items
                    if (catCount < 3 && brandCount < 3) {
                        finalSelected.push({
                            id: fallback.id,
                            name: fallback.name,
                            price: { amount: fallback.price, currency: "LKR" },
                            image_url: fallback.image,
                            in_stock: true,
                            url: "",
                            category: { id: fallback.category.toLowerCase(), name: fallback.category }
                        });
                        categoryCounts[cat] = catCount + 1;
                        brandCounts[brand] = brandCount + 1;
                        seenCategories.add(cat);
                    }
                }
                if (finalSelected.length >= 12 && Array.from(seenCategories).length >= 5) break;
            }
        }

        // Map final list to UI structures (popularBundles & fastDelivery)
        // Bundles: must strictly be hampers, bouquets, chocolate bundles, gift sets, combos
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

        // Backfill popularBundles from fallback gift items if less than 5
        if (popularBundlesMapped.length < 5) {
            const fallbackGifts = EMERGENCY_FALLBACK_CATALOG.filter(f => f.category === "Popular Gifts");
            for (const gift of fallbackGifts) {
                if (!popularBundlesMapped.some(b => b.name === gift.name)) {
                    popularBundlesMapped.push({
                        id: gift.id,
                        name: gift.name,
                        price: gift.price,
                        image: gift.image,
                        url: "",
                        tag: gift.tag
                    });
                }
                if (popularBundlesMapped.length >= 5) break;
            }
        }

        // Backfill fastDelivery from fallback individual items if less than 6
        if (fastDeliveryMapped.length < 6) {
            const fallbackIndivs = EMERGENCY_FALLBACK_CATALOG.filter(f => f.category !== "Popular Gifts");
            for (const item of fallbackIndivs) {
                if (!fastDeliveryMapped.some(fd => fd.name === item.name)) {
                    fastDeliveryMapped.push({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        url: ""
                    });
                }
                if (fastDeliveryMapped.length >= 6) break;
            }
        }

        // Shuffle both selections to create a sense of discovery and freshness on every refresh
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
        console.error("Landing Products API exception, using full Emergency Fallback:", error);
        
        // Return pure Emergency Fallback on global exception
        const popularBundles = EMERGENCY_FALLBACK_CATALOG.filter(f => f.category === "Popular Gifts")
            .slice(0, 5)
            .map(fallback => ({
                id: fallback.id,
                name: fallback.name,
                price: fallback.price,
                image: fallback.image,
                url: "",
                tag: fallback.tag
            }));

        const fastDelivery = EMERGENCY_FALLBACK_CATALOG.filter(f => f.category !== "Popular Gifts")
            .slice(0, 6)
            .map(fallback => ({
                id: fallback.id,
                name: fallback.name,
                price: fallback.price,
                image: fallback.image,
                url: ""
            }));

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
    }
}
