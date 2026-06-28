async function runTest(message: string) {
    console.log(`\nTesting message: "${message}"`);
    const chatSessionId = `test-intent-session-${Date.now()}`;
    
    const r = await fetch('http://localhost:3000/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ 
            message: message, 
            history: [],
            sessionId: chatSessionId,
            godModeEnabled: true 
        }), 
        headers: { 'Content-Type': 'application/json' } 
    });
    
    console.log('Response Status:', r.status);
    
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
        return false;
    }
    
    const triggeredGuardrail = responseText.includes("I'm Kappy, a shopping assistant for Kapruka") && 
                              responseText.includes("programming, academic questions");
                              
    if (triggeredGuardrail) {
        console.error("❌ FAILURE: Message incorrectly triggered the domain guardrail!");
        return false;
    } else {
        console.log("✅ SUCCESS: Bypassed domain guardrail. Response content sample:");
        // Extract plain text parts (the "0:" stream lines) if available, otherwise just print snippet
        const lines = responseText.split('\n').filter(l => l.startsWith('0:'));
        if (lines.length > 0) {
            const cleanResponse = lines.map(l => JSON.parse(l.substring(2))).join('');
            console.log(cleanResponse);
        } else {
            console.log(responseText.slice(0, 300));
        }
        return true;
    }
}

async function checkServer() {
    try {
        await fetch('http://localhost:3000');
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.error("Server is not running on port 3000. Please start Next.js dev server first.");
        return;
    }
    
    const testCases = [
        "shall we buy some gift for my mom for her brithday",
        "enda ammaku birthday varuthu naanga ethum vaanguvamaa",
        "ok proceed"
    ];
    
    let allPassed = true;
    for (const tc of testCases) {
        const passed = await runTest(tc);
        if (!passed) allPassed = false;
    }
    
    if (allPassed) {
        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
    } else {
        console.error("\n❌ SOME TESTS FAILED.");
    }
}

main().catch(console.error);

export {};
