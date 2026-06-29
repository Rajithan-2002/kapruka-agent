const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const http = require('http');

const env = fs.readFileSync('.env', 'utf-8');
let url, key;
env.split('\n').forEach(l => {
    if(l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if(l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});
const supabase = createClient(url, key);

async function run() {
    console.log("Checking OLD trace e36a7de8-cf9c-4e07-aadf-4e256d3066d4...");
    const oldRow = await supabase.from('godmode_traces').select('trace_id, created_at').eq('trace_id', 'e36a7de8-cf9c-4e07-aadf-4e256d3066d4');
    console.log("OLD ROW in DB:", JSON.stringify(oldRow.data, null, 2));

    console.log("\nChecking NEW trace 4d03f4e7-5650-44e9-b8d1-1d3b22b9563c (generated after fixes with godModeEnabled: true)...");
    const newRow = await supabase.from('godmode_traces').select('trace_id, created_at, session_summary').eq('trace_id', '4d03f4e7-5650-44e9-b8d1-1d3b22b9563c');
    console.log("NEW ROW in DB:", JSON.stringify(newRow.data, null, 2));

    const req = http.request({hostname: 'localhost', port: 3000, path: '/api/godmode/trace/4d03f4e7-5650-44e9-b8d1-1d3b22b9563c?tab=overview', method: 'GET'}, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
            console.log('\nAPI RESPONSE for NEW TRACE:');
            console.log(b);
        });
    });
    req.end();
}

run();
