import { MCPProduct } from "./mcp";
import { LifecycleLog } from "./recommendationValidator";

export interface RecommendationContext {
    situation: string;
    recipient: string;
    recipientPreferences: string[];
    targetBudget: number;
    userIntent?: string;
    purchaseCategories?: string[];
}

export interface RankedProduct {
    id: string;
    name: string;
    price: number;
    image_url: string;
    url: string;
    category?: string;
    isHighlighted: boolean;
    reason: string;
    delivery: string;
    inStock: boolean;
    score: number;
}

export function rankProducts(
    products: MCPProduct[], 
    context: RecommendationContext, 
    lifecycleLogs: LifecycleLog[] = []
): { ranked: RankedProduct[], logs: LifecycleLog[] } {
    if (!products || products.length === 0) return { ranked: [], logs: lifecycleLogs };

    const intentLower = (context.userIntent || "").toLowerCase();

    const scoredList = products.map((prod) => {
        const name = prod.name.toLowerCase();
        const summary = (prod.summary || "").toLowerCase();
        const priceAmount = prod.price.amount;
        const category = (prod.category?.name || "").toLowerCase();

        // 1. INTENT MATCH (35%)
        let intentScore = 0.5;
        if (intentLower) {
            const keywords = intentLower.split(/\s+/);
            const matches = keywords.filter(kw => kw.length > 2 && (name.includes(kw) || category.includes(kw) || summary.includes(kw)));
            if (matches.length > 0) intentScore = 0.8 + (0.2 * (matches.length / keywords.length));
        } else {
            intentScore = 1.0; // If no specific intent, don't penalize
        }

        // 2. USER PREFERENCES (15%)
        let prefScore = 0.0;
        if (context.recipientPreferences && context.recipientPreferences.length > 0) {
            for (const pref of context.recipientPreferences) {
                if (name.includes(pref.toLowerCase()) || summary.includes(pref.toLowerCase())) {
                    prefScore = 1.0;
                    break;
                }
            }
        } else {
            prefScore = 0.5; // Neutral
        }

        // 3. PURCHASE HISTORY (15%)
        let historyScore = 0.0;
        if (context.purchaseCategories && context.purchaseCategories.length > 0) {
            if (context.purchaseCategories.some(cat => category.includes(cat.toLowerCase()) || cat.toLowerCase().includes(category))) {
                historyScore = 1.0;
            }
        } else {
            historyScore = 0.5; // Neutral
        }

        // 4. RELATIONSHIP CONTEXT (10%)
        let relationScore = 0.5;
        const recipient = context.recipient.toLowerCase();
        const situation = context.situation.toLowerCase();
        
        if (recipient === "mother" || recipient === "amma") {
            if (name.includes("tea") || name.includes("spa") || name.includes("garden") || name.includes("saree") || name.includes("cake")) relationScore = 1.0;
        } else if (recipient === "girlfriend" || recipient === "wife") {
            if (name.includes("rose") || name.includes("chocolate") || name.includes("teddy") || name.includes("perfume")) relationScore = 1.0;
        } else if (recipient === "father" || recipient === "thaththa") {
            if (name.includes("shaving") || name.includes("belt") || name.includes("wallet") || name.includes("coffee")) relationScore = 1.0;
        }
        
        if (situation.includes("birthday") && name.includes("cake")) relationScore = 1.0;
        if (situation.includes("anniversary") && name.includes("flower")) relationScore = 1.0;

        // 5. BUDGET MATCH (10%)
        let budgetScore = 0.0;
        const target = context.targetBudget;
        if (target > 0) {
            if (priceAmount <= target) {
                const ratio = priceAmount / target;
                budgetScore = ratio >= 0.7 ? 1.0 : 0.7; // Ideal is close to budget
            } else {
                budgetScore = 0.4; // Slightly over budget
            }
        } else {
            budgetScore = 0.8;
        }

        // 6. DELIVERY SUITABILITY (5%)
        let deliveryScore = prod.in_stock ? 1.0 : 0.0;
        let deliveryBadge = prod.in_stock ? "🚚 Fast Delivery" : "🚚 Standard Delivery";

        // 7. POPULARITY (5%)
        let popScore = Math.random() * 0.5 + 0.5; // Mock since MCP doesn't return popularity

        // 8. RATING (5%)
        let ratingScore = 1.0; // Mock since MCP doesn't return ratings

        // TOTAL WEIGHTED SCORE
        const totalScore = 
            (intentScore * 0.35) + 
            (prefScore * 0.15) + 
            (historyScore * 0.15) + 
            (relationScore * 0.10) + 
            (budgetScore * 0.10) + 
            (deliveryScore * 0.05) + 
            (popScore * 0.05) + 
            (ratingScore * 0.05);

        // Procedural Reason Generation
        let reason = "A great option available for delivery.";
        const strongestDims = [];
        if (intentScore >= 0.8) strongestDims.push("matches your exact search");
        if (prefScore === 1.0) strongestDims.push("aligns with saved preferences");
        if (historyScore === 1.0) strongestDims.push("is similar to past purchases");
        if (relationScore === 1.0) strongestDims.push("is a classic gift for this occasion");
        if (budgetScore === 1.0) strongestDims.push("fits your budget perfectly");

        if (strongestDims.length > 0) {
            reason = `Recommended because it ${strongestDims.slice(0, 2).join(" and ")}.`;
        }

        const rankedItem: RankedProduct = {
            id: prod.id,
            name: prod.name,
            price: priceAmount,
            image_url: prod.image_url,
            url: prod.url,
            category: prod.category?.name,
            isHighlighted: false,
            reason,
            delivery: deliveryBadge,
            inStock: prod.in_stock || false,
            score: parseFloat(totalScore.toFixed(2))
        };

        // Update Lifecycle Log
        const logEntry = lifecycleLogs.find(l => l.productId === prod.id);
        if (logEntry) {
            logEntry.stage = "Scoring Engine V2";
            logEntry.score = rankedItem.score;
        }

        return rankedItem;
    });

    // Sort scored items descending
    const sorted = scoredList.sort((a, b) => b.score - a.score);

    // Assign Ranks and Highlight Status to logs
    sorted.forEach((item, index) => {
        const rank = index + 1;
        const logEntry = lifecycleLogs.find(l => l.productId === item.id);
        if (logEntry) {
            logEntry.rank = rank;
        }
    });

    return { ranked: sorted, logs: lifecycleLogs };
}
