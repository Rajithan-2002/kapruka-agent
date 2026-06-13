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
    justifications: string[];
    delivery: string;
    inStock: boolean;
    score: number;
}

export function rankProducts(
    products: any[], 
    context: RecommendationContext, 
    lifecycleLogs: LifecycleLog[] = []
): { ranked: RankedProduct[], logs: LifecycleLog[] } {
    if (!products || products.length === 0) return { ranked: [], logs: lifecycleLogs };

    const intentLower = (context.userIntent || "").toLowerCase();
    const isColdStart = (!context.purchaseCategories || context.purchaseCategories.length === 0) && (!context.recipientPreferences || context.recipientPreferences.length === 0);

    // Dynamic Weights (Cold Start Protection)
    // Normal: 35% Occasion, 30% Recipient, 15% Budget, 10% User Preference, 5% Popularity, 5% Availability
    // Cold Start: 45% Occasion, 35% Recipient, 15% Budget, 0% Preference, 2.5% Pop, 2.5% Avail
    const W_OCCASION = isColdStart ? 0.45 : 0.35;
    const W_RECIPIENT = isColdStart ? 0.35 : 0.30;
    const W_BUDGET = 0.15;
    const W_PREF = isColdStart ? 0.0 : 0.10;
    const W_POP = isColdStart ? 0.025 : 0.05;
    const W_AVAIL = isColdStart ? 0.025 : 0.05;

    let scoredList: RankedProduct[] = products.map((prod) => {
        const name = prod.name.toLowerCase();
        const summary = (prod.summary || "").toLowerCase();
        const priceAmount = prod.price?.amount || prod.price || 0;
        const category = (prod.category?.name || prod.category || "").toLowerCase();
        
        let existingLog = lifecycleLogs.find(l => l.productId === prod.id);
        const passedStages = existingLog?.passedStages || [];

        // 1. OCCASION MATCH (Stage 5 Component)
        let occasionScore = 0.5;
        if (intentLower) {
            const keywords = intentLower.split(/\s+/);
            const matches = keywords.filter(kw => kw.length > 2 && (name.includes(kw) || category.includes(kw) || summary.includes(kw)));
            if (matches.length > 0) occasionScore = 0.8 + (0.2 * (matches.length / keywords.length));
        } else {
            occasionScore = 1.0;
        }

        // 2. RECIPIENT MATCH
        let recipientScore = 0.5;
        const recipient = context.recipient.toLowerCase();
        const situation = context.situation.toLowerCase();
        
        if (recipient === "mother" || recipient === "amma") {
            if (name.includes("tea") || name.includes("spa") || name.includes("garden") || name.includes("saree") || name.includes("cake")) recipientScore = 1.0;
        } else if (recipient === "girlfriend" || recipient === "wife") {
            if (name.includes("rose") || name.includes("chocolate") || name.includes("teddy") || name.includes("perfume")) recipientScore = 1.0;
        } else if (recipient === "father" || recipient === "thaththa" || recipient === "dad") {
            if (name.includes("shaving") || name.includes("belt") || name.includes("wallet") || name.includes("coffee") || category.includes("electronics") || category.includes("watches")) recipientScore = 1.0;
        }
        
        if (situation.includes("birthday") && name.includes("cake")) occasionScore = 1.0;
        if (situation.includes("anniversary") && name.includes("flower")) occasionScore = 1.0;

        // Apply Penalty from Stage 2 (Allow/Penalize/Block)
        if (prod.penaltyFlag) {
            recipientScore *= 0.3; // Heavy penalty
        }

        // Apply Child Context Filter boosts and penalties
        if (prod.childPenalty) {
            recipientScore *= 0.05; // Extremely heavy penalty to trigger common sense validation failure
            occasionScore *= 0.05;
        }
        if (prod.childBoost) {
            recipientScore = Math.min(1.0, recipientScore + 0.3);
            occasionScore = Math.min(1.0, occasionScore + 0.3);
        }

        // 3. BUDGET MATCH
        let budgetScore = 0.0;
        const target = context.targetBudget;
        if (target > 0) {
            if (priceAmount <= target) {
                const ratio = priceAmount / target;
                budgetScore = ratio >= 0.7 ? 1.0 : 0.7;
            } else {
                budgetScore = 0.4;
            }
        } else {
            budgetScore = 0.8;
        }

        // 4. PREFERENCES
        let prefScore = 0.5;
        if (!isColdStart && context.recipientPreferences && context.recipientPreferences.length > 0) {
            for (const pref of context.recipientPreferences) {
                if (name.includes(pref.toLowerCase()) || summary.includes(pref.toLowerCase())) {
                    prefScore = 1.0;
                    break;
                }
            }
        }

        // 5. AVAILABILITY & POPULARITY
        let availScore = prod.in_stock ? 1.0 : 0.0;
        let popScore = Math.random() * 0.5 + 0.5; // Mock popularity

        // TOTAL WEIGHTED SCORE
        const totalScore = 
            (occasionScore * W_OCCASION) + 
            (recipientScore * W_RECIPIENT) + 
            (budgetScore * W_BUDGET) + 
            (prefScore * W_PREF) + 
            (popScore * W_POP) + 
            (availScore * W_AVAIL);
            
        passedStages.push("scoring_engine");

        // STAGE 6: COMMON SENSE VALIDATOR
        // Would a reasonable human suggest this?
        const validatorScore = occasionScore + recipientScore;
        let isRejectedByCommonSense = false;
        if (validatorScore < 0.9) { // If both are extremely weak, it's a random generic result
            isRejectedByCommonSense = true;
        }
        
        if (!isRejectedByCommonSense) passedStages.push("common_sense_validator");

        // JUSTIFICATION OBJECT (Stage 8)
        const justifications: string[] = [];
        if (occasionScore >= 0.8) justifications.push(`matches_${situation.replace(/\s+/g, '_')}`);
        if (recipientScore >= 0.8) justifications.push(`appropriate_for_${recipient}`);
        if (budgetScore === 1.0) justifications.push("within_budget");
        if (prefScore === 1.0) justifications.push("aligns_with_preferences");
        
        // Procedural Reason String for UI display (using factual justifications instead of generic ones)
        let displayReason = "A relevant option for your requirement.";
        if (justifications.length > 0) {
            const humanReadable = justifications.map(j => j.replace(/_/g, ' '));
            displayReason = `Recommended because it ${humanReadable.slice(0, 2).join(" and ")}.`;
        }

        if (existingLog) {
            existingLog.stage = isRejectedByCommonSense ? "Failed Common Sense Validator" : "Scoring Engine V3";
            existingLog.score = totalScore;
            existingLog.status = isRejectedByCommonSense ? "FAILED" : "PASSED";
            existingLog.passedStages = passedStages;
            existingLog.justifications = justifications;
        }

        return {
            id: prod.id,
            name: prod.name,
            price: priceAmount,
            image_url: prod.image_url || prod.imageUrl || "",
            url: prod.url,
            category: category,
            isHighlighted: false,
            reason: displayReason,
            justifications: justifications,
            delivery: prod.in_stock ? "🚚 Fast Delivery" : "🚚 Standard Delivery",
            inStock: prod.in_stock || false,
            score: isRejectedByCommonSense ? 0 : parseFloat(totalScore.toFixed(3))
        };
    });

    // Remove rejected items
    scoredList = scoredList.filter(p => p.score > 0);
    
    // Sort descending
    scoredList.sort((a, b) => b.score - a.score);

    // STAGE 7: DIVERSITY PASS
    // Ensure the top 3 items don't share the exact same broad category if possible
    if (scoredList.length > 3) {
        const diverseList: RankedProduct[] = [];
        const seenCategories = new Set<string>();
        
        // First pass: Try to pick highest scoring unique categories
        for (const p of scoredList) {
            const broadCat = p.category?.split(">")[0]?.trim() || "general";
            if (!seenCategories.has(broadCat)) {
                diverseList.push(p);
                seenCategories.add(broadCat);
                const log = lifecycleLogs.find(l => l.productId === p.id);
                if (log) log.passedStages.push("diversity_pass");
            }
            if (diverseList.length >= 3) break;
        }
        
        // If we couldn't find 3 unique categories, backfill with the remaining highest scored items
        if (diverseList.length < 3) {
            for (const p of scoredList) {
                if (!diverseList.find(d => d.id === p.id)) {
                    diverseList.push(p);
                    const log = lifecycleLogs.find(l => l.productId === p.id);
                    if (log) log.passedStages.push("diversity_pass");
                }
                if (diverseList.length >= 3) break;
            }
        }
        
        // Append the rest
        for (const p of scoredList) {
            if (!diverseList.find(d => d.id === p.id)) {
                diverseList.push(p);
                const log = lifecycleLogs.find(l => l.productId === p.id);
                if (log) log.passedStages.push("diversity_pass");
            }
        }
        scoredList = diverseList;
    } else {
        scoredList.forEach(p => {
            const log = lifecycleLogs.find(l => l.productId === p.id);
            if (log) log.passedStages.push("diversity_pass");
        });
    }

    // Assign Ranks
    scoredList.forEach((item, index) => {
        const rank = index + 1;
        const logEntry = lifecycleLogs.find(l => l.productId === item.id);
        if (logEntry) {
            logEntry.rank = rank;
        }
    });

    return { ranked: scoredList, logs: lifecycleLogs };
}
