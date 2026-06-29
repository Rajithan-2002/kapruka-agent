import { getRecentChatHistory } from "./frontend/src/lib/services/chatHistoryService";
// Need to just POST to the chat API
async function testChat() {
    const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: "can i order something for my brother's graduation he likes watches a lot" }],
            session_id: "test-session-1234",
            user_id: "00000000-0000-0000-0000-000000000000",
            profile: null,
            godModeFilters: { disableSemantic: false }
        })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 1000));
}
testChat();
