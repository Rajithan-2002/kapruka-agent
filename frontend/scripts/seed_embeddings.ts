import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Simple .env file parsing (avoids extra dependencies like dotenv in Next.js builds)
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = "";
let supabaseServiceKey = "";
let openaiApiKey = "";

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key: string) => {
        const match = envContent.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim() : "";
    };
    supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');
    openaiApiKey = getEnv('OPENAI_API_KEY');
} else {
    supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
    openaiApiKey = process.env.OPENAI_API_KEY || "";
}

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Error: Missing Supabase credentials in env or .env file.");
    process.exit(1);
}
if (!openaiApiKey) {
    console.error("❌ Error: Missing OpenAI API key in env or .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

async function seedEmbeddings() {
    console.log("==========================================================");
    console.log(" SEEDING FEW-SHOT EMBEDDINGS USING SYNTHETIC CONTEXT");
    console.log("==========================================================");

    // 1. Fetch all few-shot templates
    console.log("[1/3] Fetching rows from public.kappy_few_shots...");
    const { data: rows, error: fetchError } = await supabase
        .from('kappy_few_shots')
        .select('*');

    if (fetchError || !rows) {
        console.error("❌ Error fetching rows from Supabase:", fetchError?.message || "No data returned");
        console.error("Make sure you have run the migration scripts 04 and 05 first in the Supabase SQL editor.");
        process.exit(1);
    }

    console.log(`      Success: Fetched ${rows.length} rows to process.`);

    // 2. Generate and update embeddings
    console.log("[2/3] Generating vectors and updating database...");
    
    let successCount = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Construct synthetic embedding text to preserve semantic context
        const embeddingText = `Language: ${row.language}\nIntent: ${row.intent}\nEmotion: ${row.emotion}\nUser: ${row.user_query}\nAssistant: ${row.assistant_response}`;
        
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: embeddingText,
            });

            const embedding = response.data[0].embedding;

            const { error: updateError } = await supabase
                .from('kappy_few_shots')
                .update({ embedding })
                .eq('id', row.id);

            if (updateError) {
                console.error(`      ⚠️ Failed to update row ID ${row.id}:`, updateError.message);
            } else {
                successCount++;
                console.log(`      [${successCount}/${rows.length}] Updated embedding for ID ${row.id} (${row.intent} - ${row.language})`);
            }
        } catch (err: any) {
            console.error(`      ❌ Exception during embedding generation for row ID ${row.id}:`, err.message);
        }
    }

    console.log("==========================================================");
    console.log(` SEEDING FINISHED. Successfully updated ${successCount}/${rows.length} rows.`);
    console.log("==========================================================");
}

seedEmbeddings().catch(err => {
    console.error("❌ Fatal unhandled exception:", err);
});
