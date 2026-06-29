import { mcpSearchProducts } from "./frontend/src/lib/mcp";

async function test() {
    console.log("Searching...");
    const products = await mcpSearchProducts("watches graduation brother", 50);
    console.log("Found:", products?.length || 0);
    if (products && products.length > 0) {
        console.log(products[0]);
    }
}
test();
