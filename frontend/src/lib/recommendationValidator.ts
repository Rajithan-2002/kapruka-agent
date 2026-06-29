export interface ValidationContext {
    userIntent: string;           
    currentShoppingStage: string; 
    occasion?: string;
    recipient?: string;
    budget?: number;
    budgetNormalized?: { min?: number | null, max?: number | null, target?: number | null } | null;
    searchQuery: string;
    mappedCategory?: string;
    originalMessage?: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    url: string;
    category?: string;
    description?: string;
    imageUrl?: string;
    in_stock?: boolean;
}

export interface LifecycleLog {
    productId: string;
    productName: string;
    stage: string;
    status: "PASSED" | "FAILED";
    reason?: string;
    score?: number;
    rank?: number;
    isDisplayed?: boolean;
    isHighlighted?: boolean;
    passedStages: string[];
    justifications: string[];
}

export interface AdultIntentDetectorResult {
    isAdultIntent: boolean;
    confidence: number;
}

export class AdultIntentDetector {
    private static englishKeywords = [
        "adult toy", "sex toy", "sexual wellness", "intimate product", "lingerie", "romantic adult gift",
        "erotic", "dildo", "vibrator", "lubricant", "condom", "masturbator", "sexual"
    ];

    private static sinhalaKeywords = [
        "වැඩිහිටි සෙල්ලම් බඩු", "ලිංගික", "වැඩිහිටි තෑගි"
    ];

    private static tamilKeywords = [
        "பாலியல்", "வயது வந்தோர்", "காம", "வயதுவந்தோர் தையல்", "உறவு"
    ];

    public static detect(input: string): AdultIntentDetectorResult {
        const lowerInput = input.toLowerCase().trim();
        if (!lowerInput) {
            return { isAdultIntent: false, confidence: 0 };
        }

        const hasEnglish = this.englishKeywords.some(kw => lowerInput.includes(kw));
        const hasSinhala = this.sinhalaKeywords.some(kw => lowerInput.includes(kw));
        const hasTamil = this.tamilKeywords.some(kw => lowerInput.includes(kw));

        // If there's any child keyword, it overrides the adult intent immediately
        const childKeywords = ["kids", "child", "children", "baby", "newborn", "son", "daughter", "toys", "toy", "teddy bear", "teddy", "baby shower", "soft toy"];
        const hasChild = childKeywords.some(kw => lowerInput.includes(kw));

        if (hasChild) {
            return { isAdultIntent: false, confidence: 0 };
        }

        if (hasEnglish || hasSinhala || hasTamil) {
            return { isAdultIntent: true, confidence: 1.0 };
        }

        return { isAdultIntent: false, confidence: 0 };
    }
}

export function applyChildContextFilter(products: Product[], query: string) {
    const lowerQuery = query.toLowerCase();
    const childKeywords = ["kids", "child", "children", "baby", "newborn", "son", "daughter", "toys", "toy", "teddy bear", "teddy", "baby shower", "soft toy"];
    const isChildQuery = childKeywords.some(kw => lowerQuery.includes(kw));

    if (!isChildQuery) return;

    // Boost & Penalize keywords for category/name matching
    const boostKeywords = ["toy", "kids", "baby", "child", "education", "book", "plush", "game", "sport", "pencil", "crayon", "clay", "paint", "learning", "puzzle", "lego", "doll"];
    const penalizeKeywords = ["lingerie", "adult", "men", "women", "perfume", "decor", "jewelry", "jewellery", "romantic", "handbag", "kitchen", "appliance", "office", "cosmetic", "makeup", "facial", "cologne", "watch", "flower", "bouquet", "rose"];

    products.forEach((prod) => {
        const name = prod.name.toLowerCase();
        const rawCategory = prod.category;
        const category = (typeof rawCategory === 'object' && rawCategory !== null ? ((rawCategory as any).name || (rawCategory as any).id || "") : (rawCategory || "")).toLowerCase();

        const isBoost = boostKeywords.some(kw => name.includes(kw) || category.includes(kw));
        const isPenalize = penalizeKeywords.some(kw => name.includes(kw) || category.includes(kw));

        if (isBoost) {
            (prod as any).childBoost = true;
        }
        if (isPenalize) {
            (prod as any).childPenalty = true;
        }
    });
}

function isAdultProduct(name: string, category: string): boolean {
    const keywords = [
        "cigarette", "tobacco", "cigar", "vape", "nicotine", "alcohol", "liquor", "wine", "beer", "whiskey", "vodka", "rum",
        "adult", "sexual", "erotic", "dildo", "masturbator", "sex toy", "intimate", "lubricant", "condom", "vibrator", "lingerie"
    ];
    return keywords.some(kw => name.includes(kw) || category.includes(kw));
}

function isClinicalProduct(name: string, category: string): boolean {
    const keywords = ["pill organizer", "pill box", "medical", "medicine", "orthopedic", "aid", "surgical", "blood pressure", "diagnostic"];
    return keywords.some(kw => name.includes(kw) || category.includes(kw));
}

function checkCategoryIntelligence(name: string, category: string, occasion: string, recipient: string): "ALLOW" | "PENALIZE" | "BLOCK" {
    const lowerOcc = occasion.toLowerCase();
    const lowerRec = recipient.toLowerCase();
    
    if (lowerOcc.includes("father") || lowerRec.includes("father") || lowerRec.includes("thaththa") || lowerRec.includes("dad")) {
        if (category.includes("women") || category.includes("female") || category.includes("lingerie") || category.includes("makeup") || name.includes("facial kit")) {
            return "BLOCK";
        }
        if (name.includes("flower") || name.includes("romantic") || name.includes("couple") || name.includes("friend") || name.includes("bff")) {
            return "PENALIZE";
        }
        return "ALLOW";
    }

    if (lowerOcc.includes("mother") || lowerRec.includes("mother") || lowerRec.includes("amma") || lowerRec.includes("mom")) {
        if (category.includes("men") || category.includes("male") || category.includes("shaving") || name.includes("beard")) {
            return "BLOCK";
        }
        if (category.includes("gaming") || category.includes("tool") || category.includes("hardware") || name.includes("romantic") || name.includes("couple") || name.includes("sexy") || name.includes("friend") || name.includes("bff")) {
            return "PENALIZE";
        }
        return "ALLOW";
    }
    
    if (lowerRec.includes("child") || lowerRec.includes("baby") || lowerRec.includes("kid") || lowerRec.includes("son") || lowerRec.includes("daughter")) {
        if (name.includes("coffee") || name.includes("tea") || category.includes("corporate") || name.includes("wallet")) {
            return "BLOCK";
        }
        return "ALLOW";
    }

    return "ALLOW"; // Default safe fallback
}

export function validateProducts(
    products: Product[],
    context: ValidationContext,
    lifecycleLogs: LifecycleLog[] = []
): { approved: Product[]; rejected: Product[]; logs: LifecycleLog[] } {
    const approved: Product[] = [];
    const rejected: Product[] = [];

    const intentLower = context.userIntent.toLowerCase();

    // 1. Detect Adult Intent and Child Context Filter
    const rawMessage = context.originalMessage || context.userIntent || "";
    const adultDetection = AdultIntentDetector.detect(rawMessage + " " + context.searchQuery);
    const isAdultIntent = adultDetection.isAdultIntent;

    applyChildContextFilter(products, rawMessage + " " + context.searchQuery);

    for (const prod of products) {
        const prodName = prod.name.toLowerCase();
        const rawCategory = prod.category;
        const prodCategory = (typeof rawCategory === 'object' && rawCategory !== null ? ((rawCategory as any).name || (rawCategory as any).id || "") : (rawCategory || "")).toLowerCase();
        
        let isRejected = false;
        let rejectionReason = "";
        let failedStage = "";
        const passedStages: string[] = [];

        // STAGE 1: HARD FILTER LAYER (Airport Security)
        const isAdult = isAdultProduct(prodName, prodCategory);
        if (isAdult && !isAdultIntent && !intentLower.includes("cigarette") && !intentLower.includes("alcohol") && !intentLower.includes("wine")) {
            isRejected = true;
            failedStage = "Stage 1: Hard Filter";
            rejectionReason = "Adult/erotic item rejected from general recommendations";
        }
        
        if (!isRejected && isClinicalProduct(prodName, prodCategory) && !intentLower.includes("pill") && !intentLower.includes("medical")) {
            isRejected = true;
            failedStage = "Stage 1: Hard Filter";
            rejectionReason = "Clinical medical utility item hidden from general gift recommendations";
        }

        if (!isRejected) passedStages.push("hard_filter");

        // STAGE 1.5: OFFICIAL CATEGORY GUARDRAIL
        if (!isRejected && context.mappedCategory && context.mappedCategory !== "UNKNOWN") {
            const mappedCat = context.mappedCategory.toUpperCase();
            
            // Map common Kapruka category keywords to our root mapped categories
            const categoryMap: Record<string, string[]> = {
                "GROCERY": ["grocery", "food", "supermarket", "beverage", "pantry", "snacks", "vegetable", "meat", "seafood", "bakery", "dairy", "spices", "sweet", "biscuit", "cookie"],
                "CAKES": ["cake", "bakery"],
                "TOYS": ["toy", "game", "kids", "plush"],
                "FASHION": ["fashion", "clothing", "shoe", "apparel", "wear", "dress", "shirt", "pant", "accessory", "jewelry", "watch"],
                "FLOWERS": ["flower", "bouquet", "rose"],
                "ELECTRONICS": ["electronic", "phone", "mobile", "computer", "appliance", "gadget", "tv", "audio"]
            };

            const allowedKeywords = categoryMap[mappedCat] || [];
            
            // If we have a strict mapping, enforce it
            if (allowedKeywords.length > 0) {
                // If it's Toys but mapped to Grocery, drop it instantly
                if (mappedCat !== "TOYS" && categoryMap["TOYS"].some(kw => prodCategory.includes(kw) || prodName.includes(kw))) {
                    isRejected = true;
                    failedStage = "Stage 1.5: Category Guardrails";
                    rejectionReason = `Product is a Toy but intent was strictly mapped to ${mappedCat}`;
                }
                // If it's Fashion but mapped to Grocery, drop it
                else if (mappedCat !== "FASHION" && categoryMap["FASHION"].some(kw => prodCategory.includes(kw))) {
                    isRejected = true;
                    failedStage = "Stage 1.5: Category Guardrails";
                    rejectionReason = `Product is Fashion but intent was strictly mapped to ${mappedCat}`;
                }
                // If it's Electronics but mapped to Grocery, drop it
                else if (mappedCat !== "ELECTRONICS" && categoryMap["ELECTRONICS"].some(kw => prodCategory.includes(kw))) {
                    isRejected = true;
                    failedStage = "Stage 1.5: Category Guardrails";
                    rejectionReason = `Product is Electronics but intent was strictly mapped to ${mappedCat}`;
                }
            }
        }
        
        if (!isRejected) passedStages.push("category_guardrail");

        // STAGE 2: ALLOW / PENALIZE / BLOCK SYSTEM (Category Intelligence)
        let catIntel = "ALLOW";
        if (!isRejected) {
            catIntel = checkCategoryIntelligence(prodName, prodCategory, context.occasion || "", context.recipient || "");
            if (catIntel === "BLOCK") {
                isRejected = true;
                failedStage = "Stage 2: Category Intelligence";
                rejectionReason = "Blocked by category rules for this recipient/occasion";
            }
        }
        if (!isRejected) passedStages.push("category_intelligence");

        // STAGE 3: CONTEXT FILTER (Budget)
        let maxAllowedBudget = Infinity;
        let hasBudgetConstraint = false;

        if (context.budgetNormalized && context.budgetNormalized.max) {
            maxAllowedBudget = context.budgetNormalized.max; 
            hasBudgetConstraint = true;
        } else if (context.budgetNormalized && context.budgetNormalized.target) {
            maxAllowedBudget = context.budgetNormalized.target * 1.5; // Soft target buffer for diversity
            hasBudgetConstraint = true;
        } else if (context.budget && context.budget > 0) {
            maxAllowedBudget = context.budget * 1.5; 
            hasBudgetConstraint = true;
        }

        if (!isRejected && hasBudgetConstraint) {
            if (prod.price > maxAllowedBudget) {
                isRejected = true;
                failedStage = "Stage 3: Context Filter";
                rejectionReason = `Price (${prod.price}) violently exceeds allowed budget max (${maxAllowedBudget})`;
            }
        }
        if (!isRejected) passedStages.push("context_filter");

        // STAGE 4: DELIVERY VALIDATION
        if (!isRejected && prod.in_stock === false) {
            isRejected = true;
            failedStage = "Stage 4: Delivery Validation";
            rejectionReason = "Out of stock";
        }
        if (!isRejected) passedStages.push("delivery_validation");

        let existingLog = lifecycleLogs.find(l => l.productId === prod.id);
        if (!existingLog) {
            existingLog = {
                productId: prod.id,
                productName: prod.name,
                stage: "",
                status: "PASSED",
                passedStages: [],
                justifications: []
            };
            lifecycleLogs.push(existingLog);
        }

        if (isRejected) {
            rejected.push(prod);
            existingLog.stage = failedStage;
            existingLog.status = "FAILED";
            existingLog.reason = rejectionReason;
            existingLog.passedStages = passedStages;
        } else {
            // If penalized by stage 2, pass it down to Stage 5 with a tag so scoring can drop it heavily
            (prod as any).penaltyFlag = catIntel === "PENALIZE";
            approved.push(prod);
            existingLog.stage = "Stage 4 Passed";
            existingLog.status = "PASSED";
            existingLog.passedStages = passedStages;
        }
    }

    return { approved, rejected, logs: lifecycleLogs };
}
