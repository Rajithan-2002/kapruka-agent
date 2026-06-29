import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"\r]/g, '');
    }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testIntegration() {
    console.log('Sending message to /api/chat with isGodMode: true...');
    
    const r = await fetch('http://localhost:3000/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ 
            message: 'Find a delicious cake for my brother', 
            history: [],
            godModeEnabled: true 
        }), 
        headers: { 'Content-Type': 'application/json' } 
    });
    
    console.log('STATUS:', r.status);
    
    // We expect a readable stream back (server-sent events)
    // To read it to the end and get traceId from the God Mode insight output or just check DB:
    let responseText = "";
    
    if (r.ok && r.body) {
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            responseText += decoder.decode(value);
        }
    } else {
        console.log("Error reading body", await r.text());
        return;
    }
    
    console.log('Response length:', responseText.length);
    console.log('Last 200 chars of response:', responseText.slice(-200));

    // Try to extract traceId from the response if it's there
    let traceId = null;
    const match = responseText.match(/traceId["':\s]+([a-f0-9\-]+)/i) || responseText.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) {
        traceId = match[1];
        console.log('Extracted Trace ID:', traceId);
    } else {
        console.log('Could not extract traceId directly from output. Will check the database for the latest trace.');
    }

    // Now query supabase for the latest godmode traces
    console.log('Checking database for godmode_traces...');
    // Add a slight delay to allow telemetry queue to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totalQuery = await supabase.from('godmode_traces').select('trace_id');
    console.log(`TOTAL TRACES IN DB: ${totalQuery.data?.length || 0}`);
    
    let query = supabase.from('godmode_traces').select('*').order('created_at', { ascending: false }).limit(1);
    if (traceId) {
        query = supabase.from('godmode_traces').select('*').eq('trace_id', traceId).limit(1);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error querying Supabase:', error);
    } else if (data && data.length > 0) {
        console.log('✅ Found trace in database!');
        const trace = data[0];
        console.log('Trace ID:', trace.id);
        console.log('Created At:', trace.created_at);
        console.log('Events Count:', trace.events?.length || 0);
        console.log('Lifecycle Count:', trace.lifecycle?.length || 0);
        console.log('Has Session Details:', !!trace.session_details);
        
        if (trace.events && trace.events.length > 0) {
            console.log('\n--- First 3 Events ---');
            trace.events.slice(0, 3).forEach((e: any, i: number) => {
                console.log(`[${i+1}] ${e.type}: ${e.name} (${e.latencyMs || 0}ms)`);
            });
            
            // Check if MCP tools were called
            const mcpEvents = trace.events.filter((e: any) => e.name?.includes('mcp') || e.type === 'tool_call');
            if (mcpEvents.length > 0) {
                console.log(`\n✅ Found ${mcpEvents.length} MCP/tool call events in the trace!`);
                mcpEvents.forEach((e: any, i: number) => {
                    console.log(`[MCP ${i+1}] ${e.name}`);
                });
            } else {
                console.log('\n⚠️ No obvious MCP/tool call events found. The model might not have called them.');
            }
        }
    } else {
        console.log('❌ No traces found in the database.');
    }
}

testIntegration().catch(console.error);
