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

const req = http.request({hostname: 'localhost', port: 3000, path: '/api/chat', method: 'POST', headers: {'Content-Type':'application/json'}}, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
        const traceMatch = b.match(/\"trace_id\":\"([^\"]+)\"/);
        if (traceMatch) {
            const traceId = traceMatch[1];
            console.log('NEW_TRACE_ID_FOUND:', traceId);
            setTimeout(() => {
                supabase.from('godmode_traces').select('*').eq('trace_id', traceId).then(dbRes => {
                    const row = dbRes.data[0];
                    if (row) {
                        console.log('--- SUMMARY ---');
                        console.log(JSON.stringify(row.session_summary, null, 2));
                        console.log('--- FUNNEL LIFECYCLES ---');
                        console.log(JSON.stringify(row.product_lifecycles, null, 2));
                        console.log('--- EVENTS ---');
                        console.log(JSON.stringify(row.telemetry_events, null, 2));
                        console.log('--- LEARNING ---');
                        console.log(JSON.stringify(row.learning_profile, null, 2));
                    } else {
                        console.log('DB ROW NOT FOUND');
                    }
                });
            }, 10000); // wait 10s for stream and onCompletion
        } else {
            console.log('NO TRACE ID FOUND IN RESPONSE:', b.substring(0, 500));
        }
    });
});
req.write(JSON.stringify({message: 'Need a birthday gift for my daughter under 5000', history: [], godModeEnabled: true, sessionId: 'test-session-123'}));
req.end();
