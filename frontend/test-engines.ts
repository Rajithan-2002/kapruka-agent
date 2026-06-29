import { createClient } from "@supabase/supabase-js";
import { normalizeText, PreIntentParser } from "./src/lib/intelligence/normalization/preIntentParser";
import * as fs from "fs";
import * as path from "path";

// Load env vars manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        }
    });
} else {
    console.error("No .env found at", envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
    console.error("Missing supabase url!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEngines() {
    console.log("=== 1. Testing PGVector (match_few_shots) ===");
    try {
        // Dummy vector of size 1536
        const dummyVector = Array.from({ length: 1536 }, () => Math.random());
        const { data, error } = await supabase.rpc("match_few_shots", {
            query_embedding: dummyVector,
            allowed_languages: ["EN", "SI", "SN"],
            match_limit: 5
        });
        if (error) {
            console.error("❌ PGVector Error:", error.message);
        } else {
            console.log("✅ PGVector Success! Returned", data?.length, "results");
        }
    } catch (e: any) {
        console.error("❌ PGVector Exception:", e.message);
    }

    console.log("\n=== 2. Testing Sri Lankan Normalization ===");
    try {
        const raw = "Mage amma ta hodama gift ekak ganna one, cake ekak wage under 5000LKR, habai flowers epa";
        const normalized = normalizeText(raw);
        console.log("Raw String:", raw);
        console.log("Normalized:", normalized);
        
        const intentResult = PreIntentParser.parse(raw, []);
        console.log("PreIntentParser Result:", JSON.stringify(intentResult, null, 2));
    } catch (e: any) {
        console.error("❌ Normalization Exception:", e.message);
    }

    console.log("\n=== 3. Testing Admin Lexicon Panel (7-time rule) ===");
    try {
        const testSlang = `test_slang_${Date.now()}`;
        const testEnglish = `test_english_${Date.now()}`;
        
        console.log(`Inserting test slang '${testSlang}' -> '${testEnglish}'`);
        
        // Loop 7 times to simulate 7 users using the word
        for (let i = 1; i <= 7; i++) {
            const { data: existing } = await supabase
                .from('kappy_community_lexicon')
                .select('id, votes')
                .eq('slang_word', testSlang)
                .eq('standard_english', testEnglish)
                .single();

            if (existing) {
                const newVotes = existing.votes + 1;
                const newStatus = newVotes >= 7 ? 'APPROVED' : 'PENDING';
                await supabase
                    .from('kappy_community_lexicon')
                    .update({ votes: newVotes, status: newStatus })
                    .eq('id', existing.id);
                console.log(`Vote ${i}: Updated to ${newVotes} votes (Status: ${newStatus})`);
            } else {
                await supabase
                    .from('kappy_community_lexicon')
                    .insert({
                        slang_word: testSlang,
                        standard_english: testEnglish,
                        category: "test",
                        votes: 1,
                        status: 'PENDING'
                    });
                console.log(`Vote 1: Inserted (Status: PENDING)`);
            }
        }
        
        // Verify final status
        const { data: finalRecord } = await supabase
            .from('kappy_community_lexicon')
            .select('votes, status')
            .eq('slang_word', testSlang)
            .single();
            
        if (finalRecord && finalRecord.status === 'APPROVED' && finalRecord.votes >= 7) {
            console.log("✅ 7-time rule Success! Final status is APPROVED.");
        } else {
            console.log("❌ 7-time rule Failed! Record:", finalRecord);
        }
        
    } catch (e: any) {
        console.error("❌ Admin Lexicon Exception:", e.message);
    }
}

testEngines();
