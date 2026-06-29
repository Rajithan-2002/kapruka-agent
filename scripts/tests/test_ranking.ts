import { mcpSearchProducts } from "./frontend/src/lib/mcp";
import { validateProducts } from "./frontend/src/lib/recommendationValidator";
import { RankingEngine } from "./frontend/src/lib/intelligence/recommendation/rankingEngine";

async function runTest() {
    const rawProducts = await mcpSearchProducts("watches graduation brother", 50);
    console.log("Raw products count:", rawProducts?.length || 0);

    const validationResult = validateProducts(
        rawProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price.amount,
            url: p.url,
            category: p.category
        })),
        {
            userIntent: "can i order something for my brother's graduation he likes watches a lot",
            currentShoppingStage: "SEARCH",
            occasion: "graduation",
            recipient: "brother",
            searchQuery: "watches graduation brother",
            mappedCategory: "FASHION",
            originalMessage: "can i order something for my brother's graduation he likes watches a lot"
        }
    );

    const rankedCandidates = RankingEngine.rankProducts(validationResult.approved as any, {
        searchQuery: "watches graduation brother",
        situation: "graduation",
        recipient: "brother",
        targetBudget: 0,
        userAffinities: [],
        communityScores: {},
        trendScores: {},
    });

    console.log("Ranked count:", rankedCandidates.length);
}
runTest();
