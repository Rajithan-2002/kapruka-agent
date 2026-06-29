import { mcpSearchProducts } from "./frontend/src/lib/mcp";
import { validateProducts } from "./frontend/src/lib/recommendationValidator";

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

    console.log("Approved count:", validationResult.approved.length);
    console.log("Rejected count:", validationResult.rejected.length);

    if (validationResult.rejected.length > 0) {
        console.log("Sample rejection reasons:");
        for (let i = 0; i < Math.min(5, validationResult.rejected.length); i++) {
            const p = validationResult.rejected[i];
            const log = validationResult.logs.find(l => l.productId === p.id);
            console.log(`- ${p.name}: ${log?.reason}`);
        }
    }
}
runTest();
