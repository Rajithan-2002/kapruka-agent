require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const readline = require("readline");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function chat() {
    while (true) {
        const userMessage = await new Promise((resolve) => {
            rl.question("You: ", resolve);
        });

        if (userMessage.toLowerCase() === "exit") {
            console.log("Goodbye!");
            rl.close();
            process.exit(0);
        }

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: userMessage,
            });

            console.log("Gemini:", response.text);
        } catch (error) {
            console.error("Error:", error.message);
        }
    }
}

chat();