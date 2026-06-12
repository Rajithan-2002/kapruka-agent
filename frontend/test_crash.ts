import fs from "fs";
import path from "path";

// Manually load environment variables from .env file
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach(line => {
        const parts = line.split("=");
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
            process.env[key] = value;
        }
    });
}

async function run() {
    try {
        const { IntelligenceOrchestrator } = await import("./src/lib/intelligence/orchestrator/intelligenceOrchestrator");
        const orchestrator = new IntelligenceOrchestrator();
        console.log("Processing Turn 2...");
        const result = await orchestrator.processRequest(
            "test_user_id",
            "can we see all items",
            [
                { role: "user", content: "lets see some cakes and chocolates" },
                { role: "assistant", content: "Here are some cakes and chocolates you might like." }
            ]
        );
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error caught:");
        console.error(e);
    }
}

run();
