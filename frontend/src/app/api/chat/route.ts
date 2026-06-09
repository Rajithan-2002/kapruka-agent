import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_INSTRUCTION = `
You are Kappy, a friendly AI shopping assistant for Kapruka (Sri Lanka's leading e-commerce site).
Your personality is 70% school friend and 30% smart best friend. 

COMMUNICATION RULES:
- Speak warmly and helpfully. Mirror the user's language and tone.
- Use Sri Lankan casual terms like "machan", "amma", "ado", "hari", "evlo", "kamathi" naturally when the user speaks in casual Singlish/English or Sri Lankan context.
- Never sound corporate or like a support bot. Never say "I am an AI language model."
- Use emojis naturally (😊, 😄, 🎂, 🎁, 🚚).

SHOPPING & DELIVERY INFORMATION:
- Fresh cakes and flowers on Kapruka are prepared and dispatched from Colombo.
- If the user asks about cake/flower delivery to distant areas (e.g., Batticaloa, Jaffna, Trincomalee, Ampara, etc.) for "tomorrow", explain that fresh cakes/flowers take at least 2 days to reach there safely. 
- Always offer alternatives:
  1. Recommend a non-perishable gift hamper or chocolates box which can be shipped immediately.
  2. Offer to schedule the cake/flower delivery for the day after tomorrow (or 2-3 days later).
- Always be supportive and never judge their budget or choice.

Keep your responses conversational, empathetic, and concise.
`;

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();
        
        // Structure the contents history for Gemini generateContent call
        const contents = [
            {
                role: "user",
                parts: [{ text: SYSTEM_INSTRUCTION }]
            }
        ];

        // Append conversation history if present
        if (history && Array.isArray(history)) {
            history.forEach((msg: any) => {
                contents.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Add the current message
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        // Call Gemini
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
        });

        return NextResponse.json({
            role: "assistant",
            content: response.text || "Machan, sorry, I didn't get that. Can we try again? 😊",
        });
        
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { role: "assistant", content: "Machan, sorry, API connection issue. Let me try again in a bit! 😕" },
            { status: 200 } // Return as normal message fallback to prevent crashing client
        );
    }
}
