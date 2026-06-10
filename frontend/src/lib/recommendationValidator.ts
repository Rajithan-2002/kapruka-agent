export interface ValidationContext {
    userIntent: string;           
    currentShoppingStage: string; 
    occasion?: string;
    recipient?: string;
    budget?: number;
    searchQuery: string;
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
}

function isAdultProduct(name: string, category: string): boolean {
    const keywords = ["cigarette", "tobacco", "cigar", "vape", "nicotine", "alcohol", "liquor", "wine", "beer", "whiskey", "vodka", "rum"];
    return keywords.some(kw => name.includes(kw) || category.includes(kw));
}

function isClinicalProduct(name: string, category: string): boolean {
    const keywords = ["pill organizer", "pill box", "medical", "medicine", "orthopedic", "aid", "surgical", "blood pressure", "diagnostic"];
    return keywords.some(kw => name.includes(kw) || category.includes(kw));
}

export function validateProducts(
    products: Product[],
    context: ValidationContext,
    lifecycleLogs: LifecycleLog[] = []
): { approved: Product[]; rejected: Product[]; logs: LifecycleLog[] } {
    const approved: Product[] = [];
    const rejected: Product[] = [];

    const intentLower = context.userIntent.toLowerCase();

    for (const prod of products) {
        const prodName = prod.name.toLowerCase();
        const prodCategory = (prod.category || "").toLowerCase();
        
        let isRejected = false;
        let rejectionReason = "";
        let failedStage = "";

        // 1. Stock Filter
        if (prod.in_stock === false) {
            isRejected = true;
            failedStage = "Stock Filter";
            rejectionReason = "Out of stock";
        }

        // 2. Adult Filter
        if (!isRejected && isAdultProduct(prodName, prodCategory) && !intentLower.includes("cigarette") && !intentLower.includes("alcohol") && !intentLower.includes("wine")) {
            isRejected = true;
            failedStage = "Adult/Restricted Filter";
            rejectionReason = "Adult/restricted item hidden from general recommendations";
        }

        // 3. Clinical Filter
        if (!isRejected && isClinicalProduct(prodName, prodCategory) && !intentLower.includes("pill") && !intentLower.includes("medical")) {
            isRejected = true;
            failedStage = "Clinical Filter";
            rejectionReason = "Clinical medical utility item hidden from general gift recommendations";
        }

        // 4. Budget Filter
        if (!isRejected && context.budget && context.budget > 0) {
            const maxAllowedBudget = context.budget * 1.25;
            if (prod.price > maxAllowedBudget) {
                isRejected = true;
                failedStage = "Budget Filter";
                rejectionReason = `Price (${prod.price}) exceeds 25% buffer of target budget (${context.budget})`;
            }
        }

        if (isRejected) {
            rejected.push(prod);
            lifecycleLogs.push({
                productId: prod.id,
                productName: prod.name,
                stage: failedStage,
                status: "FAILED",
                reason: rejectionReason
            });
        } else {
            approved.push(prod);
            lifecycleLogs.push({
                productId: prod.id,
                productName: prod.name,
                stage: "Strict Filter Layer",
                status: "PASSED"
            });
        }
    }

    return { approved, rejected, logs: lifecycleLogs };
}
