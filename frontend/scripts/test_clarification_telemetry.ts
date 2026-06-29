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

async function testClarificationTelemetry() {
    console.log('Sending Tanglish message to trigger clarification flow...');
    const chatSessionId = `test-session-${Date.now()}`;
    
    const r = await fetch('http://localhost:3000/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ 
            message: 'ammaku birthday gift venum maame', 
            history: [],
            sessionId: chatSessionId,
            godModeEnabled: true 
        }), 
        headers: { 'Content-Type': 'application/json' } 
    });
    
    console.log('Chat API Response Status:', r.status);
    
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
        console.error("Failed to read chat response:", await r.text());
        return;
    }
    
    console.log('Response content length:', responseText.length);
    
    // Extract trace ID from response
    let traceId: string | null = null;
    try {
        const parsed = JSON.parse(responseText);
        traceId = parsed.traceReport?.trace_id || parsed.trace_id;
    } catch (e) {
        // Stream format - try matching UUID
        const match = responseText.match(/"trace_id"\s*:\s*"([a-f0-9\-]+)"/i) || 
                      responseText.match(/traceReport.*?"trace_id"\s*:\s*"([a-f0-9\-]+)"/i) ||
                      responseText.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (match) {
            traceId = match[1];
        }
    }
    
    if (!traceId) {
        console.error('❌ Could not extract Trace ID from response');
        return;
    }
    
    console.log(`🔍 Extracted Trace ID: ${traceId}`);
    
    // Wait for async logging to finish
    console.log('Waiting 3 seconds for database persistence...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check database
    console.log(`Checking database for trace ID: ${traceId}...`);
    const { data, error } = await supabase
        .from('godmode_traces')
        .select('trace_id, created_at, session_summary')
        .eq('trace_id', traceId)
        .maybeSingle();
        
    if (error) {
        console.error("❌ Database query error:", error.message);
    } else if (data) {
        console.log("✅ SUCCESS: Trace found in database!");
        console.log("Trace record:", data);
    } else {
        console.log("❌ FAILURE: Trace NOT found in database.");
    }
}

testClarificationTelemetry().catch(console.error);
