import { MCPProduct } from "./mcp";

export interface RecommendationContext {
    situation: string; // birthday, apology, anniversary, general
    recipient: string; // mother, wife, girlfriend, father, friend, etc.
    recipientPreferences: string[]; // e.g. ["gardening", "tea", "baking"]
    targetBudget: number; // e.g. 5000 LKR
}

export interface RankedProduct {
    id: string;
    name: string;
    price: number;
    image_url: string;
    url: string;
    isKappyPick: boolean;
    reason: string;
    delivery: string;
    inStock: boolean;
    score: number;
}

export function rankProducts(products: MCPProduct[], context: RecommendationContext): RankedProduct[] {
    if (!products || products.length === 0) return [];

    const scoredList = products.map((prod) => {
        const name = prod.name.toLowerCase();
        const summary = (prod.summary || "").toLowerCase();
        const priceAmount = prod.price.amount;

        // 1. SITUATION MATCH (35%)
        let situationScore = 0.5; // Baseline
        const situation = context.situation.toLowerCase();
        
        if (situation.includes("birthday")) {
            if (name.includes("cake") || summary.includes("cake")) {
                situationScore = 1.0;
            } else if (name.includes("flower") || name.includes("bouquet") || summary.includes("flower")) {
                situationScore = 0.8;
            } else if (name.includes("gift") || name.includes("hamper") || summary.includes("hamper")) {
                situationScore = 0.7;
            }
        } else if (situation.includes("apology") || situation.includes("sorry")) {
            if (name.includes("flower") || name.includes("bouquet") || name.includes("rose")) {
                situationScore = 1.0;
            } else if (name.includes("chocolate") || summary.includes("chocolate")) {
                situationScore = 0.9;
            }
        } else if (situation.includes("anniversary") || situation.includes("love")) {
            if (name.includes("flower") || name.includes("rose") || name.includes("bouquet")) {
                situationScore = 1.0;
            } else if (name.includes("pendant") || name.includes("jewelry") || name.includes("hamper")) {
                situationScore = 0.9;
            }
        }

        // 2. RECIPIENT MATCH (25%)
        let recipientScore = 0.5; // Baseline
        
        // Check if product matches recipient's specific preference tags
        if (context.recipientPreferences && context.recipientPreferences.length > 0) {
            let matchesPref = false;
            for (const pref of context.recipientPreferences) {
                const cleanPref = pref.toLowerCase();
                if (name.includes(cleanPref) || summary.includes(cleanPref)) {
                    matchesPref = true;
                    break;
                }
            }
            if (matchesPref) {
                recipientScore = 1.0;
            }
        }
        
        // Occasion specific baseline fit
        const recipient = context.recipient.toLowerCase();
        if (recipient === "mother" || recipient === "amma") {
            if (name.includes("tea") || name.includes("spa") || name.includes("garden") || name.includes("plant") || name.includes("ceramic")) {
                recipientScore = Math.max(recipientScore, 0.9);
            }
        } else if (recipient === "girlfriend" || recipient === "wife") {
            if (name.includes("rose") || name.includes("chocolate") || name.includes("teddy") || name.includes("perfume")) {
                recipientScore = Math.max(recipientScore, 0.9);
            }
        } else if (recipient === "father" || recipient === "thaththa") {
            if (name.includes("shaving") || name.includes("belt") || name.includes("wallet") || name.includes("coffee") || name.includes("watch")) {
                recipientScore = Math.max(recipientScore, 0.9);
            }
        }

        // 3. DELIVERY MATCH (20%)
        let deliveryScore = 0.0;
        let deliveryBadge = "🚚 2-3 Days Delivery";
        
        if (prod.in_stock) {
            deliveryScore = 0.7; // Baseline in-stock
            deliveryBadge = "🚚 Next Day Delivery";
            
            // Check if fast delivery mentioned
            if (name.includes("cake") || name.includes("flower") || name.includes("fruit")) {
                deliveryScore = 1.0; // Same day/Tomorrow candidates
                deliveryBadge = "🚚 Tomorrow Delivery";
            }
        }

        // 4. BUDGET MATCH (15%)
        let budgetScore = 0.0;
        const target = context.targetBudget;
        
        if (priceAmount <= target) {
            // Fits budget
            const ratio = priceAmount / target;
            if (ratio >= 0.7) {
                budgetScore = 1.0; // Ideal range: 70% to 100% of budget
            } else {
                budgetScore = 0.7; // Under budget (fits, but cheap)
            }
        } else {
            // Over budget
            const ratio = priceAmount / target;
            if (ratio <= 1.25) {
                budgetScore = 0.4; // Slightly over budget (25% buffer)
            } else {
                budgetScore = 0.0; // Too expensive
            }
        }

        // 5. HISTORICAL PREFERENCE (5%)
        // Baseline default contribution
        const historyScore = 0.8; 

        // CALCULATE TOTAL WEIGHTED SCORE
        const totalScore = 
            (0.35 * situationScore) + 
            (0.25 * recipientScore) + 
            (0.20 * deliveryScore) + 
            (0.15 * budgetScore) + 
            (0.05 * historyScore);

        // BUILD WHY REASON STRING
        let reason = "Great option matching your occasion and target price.";
        if (situationScore >= 0.9 && recipientScore >= 0.9) {
            reason = `Perfect match! Fits your ${context.situation} occasion and matches your recipient's interest in ${context.recipientPreferences.join(', ') || 'personal items'}.`;
        } else if (situationScore >= 0.9) {
            reason = `Highly recommended celebration match for this ${context.situation} occasion.`;
        } else if (recipientScore >= 0.9) {
            reason = `Great recipient fit, especially matching interests in ${context.recipientPreferences.join(', ') || 'preferred items'}.`;
        }
        
        if (deliveryScore === 1.0) {
            reason += " Can be delivered rapidly to ensure it arrives in time.";
        }

        return {
            id: prod.id,
            name: prod.name,
            price: priceAmount,
            image_url: prod.image_url,
            url: prod.url,
            isKappyPick: false, // Will be set after ranking
            reason,
            delivery: deliveryBadge,
            inStock: prod.in_stock,
            score: totalScore
        };
    });

    // Sort scored items descending
    const sorted = scoredList.sort((a, b) => b.score - a.score);

    // Tag Kappy's Pick (only if we have items)
    if (sorted.length > 0) {
        sorted[0].isKappyPick = true;
        // Make Kappy's Pick explanation extra detailed
        sorted[0].reason = `⭐ KAPPY'S PICK: ${sorted[0].reason} Fits budget and represents the highest perceived value for ${context.recipient}.`;
    }

    return sorted;
}
