export interface RecommendationCandidate {
    productId: string;
    productData: any; // Raw product object from Kapruka
    situationScore: number;
    recipientScore: number;
    deliveryScore: number;
    budgetScore: number;
    affinityScore: number;
    memoryBoostScore: number;
    communityScore?: number;
    trendScore?: number;
    finalScore: number;
}
