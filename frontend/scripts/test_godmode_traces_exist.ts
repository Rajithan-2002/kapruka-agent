import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Simple .env file parsing
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = "";
let supabaseServiceKey = "";

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key: string) => {
        const match = envContent.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim() : "";
    };
    supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findTrace() {
    const targetTrace = 'd23dce37-0962-41f6-9e50-558edc83dff8';
    console.log(`Checking if trace '${targetTrace}' exists...`);
    const { data: exactMatch, error: exactError } = await supabase
        .from('godmode_traces')
        .select('trace_id, created_at, session_summary')
        .eq('trace_id', targetTrace)
        .maybeSingle();

    if (exactError) {
        console.error("❌ Error on exact match query:", exactError.message);
    } else if (exactMatch) {
        console.log("✅ Found exact match:", exactMatch);
    } else {
        console.log("❌ Exact match not found in godmode_traces.");
    }

    console.log("\nFetching the 5 most recent traces:");
    const { data: recentTraces, error: recentError } = await supabase
        .from('godmode_traces')
        .select('trace_id, created_at, session_summary')
        .order('created_at', { ascending: false })
        .limit(5);

    if (recentError) {
        console.error("❌ Error querying recent traces:", recentError.message);
    } else {
        console.log("Recent Traces:");
        recentTraces.forEach((t, i) => {
            console.log(`[${i+1}] ID: ${t.trace_id} | Created At: ${t.created_at} | Summary:`, t.session_summary);
        });
    }
}

findTrace();
