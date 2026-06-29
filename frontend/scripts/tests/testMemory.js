const http = require('http');

async function runTest() {
    console.log("=== PHASE 1: INJECT MEMORY ===");
    const payload1 = JSON.stringify({
        message: 'My father loves expensive watches. Remember this.',
        history: [],
        sessionId: 'memory-test-session',
        godModeEnabled: true
    });

    const req1 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': payload1.length }
    }, res1 => {
        let b1 = '';
        res1.on('data', c => b1 += c);
        res1.on('end', () => {
            console.log("Response 1 received. Memory should be extracted.");
            // Wait 2 seconds for DB inserts to finish
            setTimeout(testRetrieval, 2000);
        });
    });
    req1.write(payload1);
    req1.end();
}

function testRetrieval() {
    console.log("\n=== PHASE 2: TEST RECOMMENDATION ===");
    const payload2 = JSON.stringify({
        message: 'I need a gift for my father',
        history: [],
        sessionId: 'memory-test-session',
        godModeEnabled: true
    });

    const req2 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': payload2.length }
    }, res2 => {
        let b2 = '';
        res2.on('data', c => b2 += c);
        res2.on('end', () => {
            console.log("\nResponse 2 received.");
            
            const traceMatch = b2.match(/\"trace_id\":\"([^\"]+)\"/);
            if (traceMatch) {
                const traceId = traceMatch[1];
                console.log('TRACE ID for Phase 2:', traceId);
                fetchTraceProof(traceId);
            } else {
                console.log("No trace ID found!");
            }
        });
    });
    req2.write(payload2);
    req2.end();
}

function fetchTraceProof(traceId) {
    const { createClient } = require('@supabase/supabase-js');
    const fs = require('fs');
    const env = fs.readFileSync('.env', 'utf-8');
    let url, key;
    env.split('\n').forEach(l => {
        if(l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
        if(l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
    });
    const supabase = createClient(url, key);

    setTimeout(() => {
        supabase.from('godmode_traces').select('session_summary, learning_profile, telemetry_events').eq('trace_id', traceId).then(dbRes => {
            if (dbRes.data && dbRes.data.length > 0) {
                console.log("\n=== PHASE 3: PROOF FROM DB ===");
                const row = dbRes.data[0];
                console.log("LEARNING PROFILE:");
                console.log(JSON.stringify(row.learning_profile, null, 2));
                
                // Find Memory engine telemetry
                const memEvent = row.telemetry_events.find(e => e.engine === 'MEMORY');
                console.log("\nMEMORY ENGINE EVENT:");
                console.log(JSON.stringify(memEvent, null, 2));
                
                console.log("\nWINNING PRODUCT:");
                console.log(row.session_summary.winningProductName);
            } else {
                console.log("Trace not saved to DB!");
            }
        });
    }, 10000); // wait for onCompletion to insert
}

runTest();
