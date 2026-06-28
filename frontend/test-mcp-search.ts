import { mcpSearchProducts } from "./src/lib/mcp";

async function testSearch() {
    console.log("Testing Kapruka MCP Search...");
    try {
        const query = "cake"; // A common term
        const rawProducts = await mcpSearchProducts(query, 100);
        console.log(`MCP returned ${rawProducts.length} items for query '${query}'`);
        
        // Let's test another query
        const query2 = "gift for mother";
        const rawProducts2 = await mcpSearchProducts(query2, 100);
        console.log(`MCP returned ${rawProducts2.length} items for query '${query2}'`);
        
    } catch (error) {
        console.error("Test failed:", error);
    }
}
testSearch();
