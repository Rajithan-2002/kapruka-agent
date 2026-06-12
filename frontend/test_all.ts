import { createClient } from "@supabase/supabase-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ScenarioTestRunner } from "./src/lib/intelligence/testing/scenarioTestRunner";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

async function checkTable(tableName: string) {
    if (!supabase) {
        console.log(`⚠️ Supabase client not initialized (Local JSON fallback). Skipping '${tableName}' check.`);
        return true;
    }
    const { error } = await supabase.from(tableName).select("*").limit(1);
    if (error) {
        console.log(`❌ Table '${tableName}' error:`, error.message);
        return false;
    } else {
        console.log(`✅ Table '${tableName}' is accessible!`);
        return true;
    }
}

async function testDatabase() {
    console.log("=== 1. DATABASE CONNECTIVITY TESTS ===");
    const tables = ["community_analytics", "intelligence_traces", "user_affinities", "learning_events", "community_relevance_scores"];
    let allOk = true;
    for (const table of tables) {
        const ok = await checkTable(table);
        if (!ok) allOk = false;
    }
    return allOk;
}

async function testMcp() {
    console.log("\n=== 2. KAPRUKA MCP CONNECTIVITY TESTS ===");
    console.log("Connecting to Kapruka MCP Server at https://mcp.kapruka.com/mcp...");
    const transport = new StreamableHTTPClientTransport(new URL("https://mcp.kapruka.com/mcp"));
    const client = new Client({ name: "test-all-integration", version: "1.0.0" });
    
    try {
        await client.connect(transport);
        console.log("✅ MCP Connected successfully.");
        const response = await client.callTool({
            name: "kapruka_search_products",
            arguments: {
                params: {
                    q: "juice",
                    limit: 1,
                    in_stock_only: false,
                    response_format: "json"
                }
            }
        });
        const contentArray = response.content as any[];
        if (contentArray && contentArray.length > 0) {
            const rawData = JSON.parse(contentArray[0].text);
            if (rawData.results) {
                console.log(`✅ MCP Tool call succeeded. Returned product: "${rawData.results[0]?.name}"`);
                return true;
            }
        }
        console.log("❌ MCP returned unexpected response format.");
        return false;
    } catch (e: any) {
        console.error("❌ MCP Integration failed:", e.message || e);
        return false;
    }
}

async function testScenarios() {
    console.log("\n=== 3. INTELLIGENCE ORCHESTRATION SCENARIOS ===");
    try {
        const result = await ScenarioTestRunner.runTests();
        return result.failed === 0;
    } catch (e) {
        console.error("❌ Scenarios run failed with exception:", e);
        return false;
    }
}

async function runAll() {
    console.log("=================================================");
    console.log("🚀 STARTING KAPRUKA-AI INTEGRATION TEST SUITE 🚀");
    console.log("=================================================");
    
    const dbSuccess = await testDatabase();
    const mcpSuccess = await testMcp();
    const scenariosSuccess = await testScenarios();
    
    console.log("\n=================================================");
    if (dbSuccess && mcpSuccess && scenariosSuccess) {
        console.log("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
        console.log("=================================================");
        process.exit(0);
    } else {
        console.log("❌ SOME INTEGRATION TESTS FAILED.");
        console.log("=================================================");
        process.exit(1);
    }
}

runAll();
