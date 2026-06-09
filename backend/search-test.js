require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function main() {

    const query = process.argv[2] || "cake";

    const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.kapruka.com/mcp")
    );

    const client = new Client({
        name: "kapruka-test",
        version: "1.0.0",
    });

    await client.connect(transport);

    const result = await client.callTool({
        name: "kapruka_search_products",
        arguments: {
            params: {
                q: query,
                limit: 5,
                in_stock_only: true,
                response_format: "json",
            },
        },
    });

    const products =
        result.structuredContent?.result ||
        JSON.stringify(result);

    const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are Kappy, an AI shopping assistant for Kapruka.

User search:
${query}

Products returned from Kapruka:

${products}

Recommend the best products and explain why.
`,
    });

    console.log("\n===== KAPPY =====\n");
    console.log(aiResponse.text);
}

main().catch(console.error);