import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function testMcpJuice() {
    console.log("Connecting to Kapruka MCP Server...");
    
    const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.kapruka.com/mcp")
    );

    const client = new Client({
        name: "test-script",
        version: "1.0.0",
    });

    try {
        await client.connect(transport);
        console.log("Connected successfully.\n");

        console.log("Calling tool: kapruka_search_products with query: 'juice'");
        
        const response = await client.callTool({
            name: "kapruka_search_products",
            arguments: {
                params: {
                    q: "juice",
                    limit: 20,
                    in_stock_only: false,
                    response_format: "json"
                }
            }
        });

        const contentArray = response.content as any[];
        if (!contentArray || contentArray.length === 0) {
            console.log("No response content received.");
            return;
        }

        const rawData = contentArray[0].text;
        
        try {
            const data = JSON.parse(rawData);
            
            if (data.results) {
                const products = data.results;
                console.log(`\n✅ MCP Server returned ${products.length} products total.`);
                
                console.log("\n--- Product List ---");
                products.forEach((p: any, i: number) => {
                    console.log(`${i + 1}. [${p.id}] ${p.name} (Rs. ${p.price?.amount || 0})`);
                    console.log(`   Category: ${p.category?.name || 'Unknown'}`);
                    console.log(`   In Stock: ${p.in_stock}`);
                    console.log(`   URL: ${p.url}\n`);
                });
            } else {
                console.log(`Unexpected structure: ${JSON.stringify(data, null, 2)}`);
            }
        } catch (e) {
            console.log("Failed to parse JSON response:", rawData);
        }

    } catch (error) {
        console.error("Failed to connect or call MCP:", error);
    } finally {
        // Exit process
        process.exit(0);
    }
}

testMcpJuice();
