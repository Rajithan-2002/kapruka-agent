import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

async function readTraces() {
    const targetTrace = 'bb9e88ea-ec94-4af2-a1bd-098c9f02f216';
    const { data, error } = await supabase.from('godmode_traces').select('*').eq('trace_id', targetTrace).single();
    if (error) {
        console.error("Error fetching trace:", error);
    } else {
        console.log("Trace details:");
        console.log(JSON.stringify(data, null, 2));
    }
}

readTraces();
