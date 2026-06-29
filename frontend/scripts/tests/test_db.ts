import { supabase } from "@/lib/db";

async function checkTable(tableName: string) {
    if (!supabase) {
        console.log("Supabase client not initialized.");
        return;
    }
    const { data, error } = await supabase.from(tableName).select("*").limit(1);
    if (error) {
        console.log(`❌ Table '${tableName}' error:`, error.message);
    } else {
        console.log(`✅ Table '${tableName}' is accessible!`);
    }
}

async function main() {
    console.log("Checking tables...");
    await checkTable("community_analytics");
    await checkTable("intelligence_traces");
    await checkTable("user_affinities");
    await checkTable("learning_events");
    await checkTable("community_relevance_scores");
}

main();
