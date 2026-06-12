import { mcpSearchProducts } from "./src/lib/mcp";

async function test() {
    try {
        const products = await mcpSearchProducts("watch", 20);
        console.log(`Retrieved ${products.length} products:`);
        for (const p of products) {
            console.log(`- ${p.name}: Price: LKR ${p.price?.amount || p.price}, In Stock: ${p.in_stock}`);
        }
    } catch (e) {
        console.error(e);
    }
}

test();
