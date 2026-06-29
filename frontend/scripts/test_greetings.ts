import * as fs from 'fs';
import * as path from 'path';

async function testGreetings() {
    console.log('Sending greeting "hii kappy" to /api/chat...');
    const chatSessionId = `test-greeting-session-${Date.now()}`;
    
    const r = await fetch('http://localhost:3000/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ 
            message: 'hii kappy', 
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
    
    const lines = responseText.split('\n');
    const assistantMessage = lines
        .filter(l => l.startsWith('0:'))
        .map(l => {
            try {
                return JSON.parse(l.substring(2));
            } catch {
                return "";
            }
        })
        .join('');
    
    console.log('\n--- Cleaned Assistant Message ---');
    console.log(assistantMessage);
    console.log('---------------------\n');
    
    const isClarification = assistantMessage.toLowerCase().includes("shopping for") || 
                           assistantMessage.toLowerCase().includes("narrow these down") || 
                           assistantMessage.toLowerCase().includes("occasion") ||
                           assistantMessage.toLowerCase().includes("budget");
                           
    if (isClarification) {
        console.error("❌ FAILURE: Kappy responded with a shopping clarification question!");
    } else {
        console.log("✅ SUCCESS: Kappy responded with a natural greeting bypass response!");
    }
}

// Start local dev server if not already running
async function checkServer() {
    try {
        await fetch('http://localhost:3000');
        return true;
    } catch {
        return false;
    }
}

async function run() {
    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.error("Server is not running on port 3000. Please start Next.js dev server first.");
        return;
    }
    await testGreetings();
}

run().catch(console.error);
