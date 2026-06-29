import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Read env variables
const envPath = path.join(__dirname, ".env");
let supabaseUrl = "";
let supabaseServiceKey = "";

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const getEnv = (key: string) => {
        const match = envContent.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim() : "";
    };
    supabaseUrl = getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
    supabaseServiceKey = getEnv("SUPABASE_SERVICE_KEY");
} else {
    supabaseUrl = process.env.SUPABASE_URL || "";
    supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TABLES = [
    "user_profiles",
    "relationships",
    "preferences",
    "memories",
    "orders",
    "recommendation_traces",
    "search_sessions",
    "stored_conversations",
    "kappy_vocabulary",
    "kappy_few_shots",
    "godmode_traces",
    "community_analytics",
    "intelligence_traces",
    "user_affinities",
    "learning_events",
    "community_relevance_scores"
];

async function auditDatabase() {
    console.log("==========================================");
    console.log("DATABASE AUDIT - RAW EXECUTION CHECK");
    console.log("==========================================");
    
    for (const table of TABLES) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select("*", { count: "exact", head: false })
                .limit(5);
                
            if (error) {
                console.log(`❌ Table '${table}': ERROR - ${error.message}`);
            } else {
                console.log(`✅ Table '${table}': SUCCESS - Rows: ${count}, Sample: ${data?.length || 0} retrieved`);
            }
        } catch (e: any) {
            console.log(`❌ Table '${table}': EXCEPTION - ${e.message}`);
        }
    }
}

auditDatabase().catch(console.error);
