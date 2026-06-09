const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function main() {
    const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.kapruka.com/mcp")
    );

    const client = new Client({
        name: "kapruka-test",
        version: "1.0.0",
    });

    await client.connect(transport);

    const tools = await client.listTools();

    console.log(JSON.stringify(tools, null, 2));
}

main().catch(console.error);