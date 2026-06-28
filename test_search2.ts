import { mcpSearchProducts } from "./frontend/src/lib/mcp";

async function test() {
    console.log("Searching for graduation...");
    const products = await mcpSearchProducts("graduation", 50);
    console.log("Found:", products?.length || 0);
    
    console.log("Searching for watches graduation brother...");
    const p2 = await mcpSearchProducts("watches graduation brother", 50);
    console.log("Found:", p2?.length || 0);
}
test();
