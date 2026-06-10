import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Checks if a string contains Sinhala or Tamil unicode characters.
 */
export function hasSinhalaOrTamil(text: string): boolean {
    const sinhalaRange = /[\u0d80-\u0dff]/;
    const tamilRange = /[\u0b80-\u0bff]/;
    return sinhalaRange.test(text) || tamilRange.test(text);
}

/**
 * Translates Sinhala or Tamil search terms into concise English keywords for Kapruka MCP search.
 * If the string is purely English/Singlish/ASCII, it passes it through unchanged.
 */
export async function translateSearchQuery(query: string): Promise<string> {
    if (!query || !query.trim()) return "";

    // If query is purely ASCII/English, do not call LLM to save latency
    if (!hasSinhalaOrTamil(query)) {
        return query.trim();
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Translate the Sri Lankan local language (Sinhala/Tamil) query into standard English product keywords suitable for an e-commerce search engine catalog. Return ONLY the final English keywords/phrases without any quotes or explanations (e.g., 'birthday cake', 'red flowers', 'chocolate hamper')."
                },
                {
                    role: "user",
                    content: query
                }
            ]
        });

        const translated = response.choices[0].message.content?.trim() || query;
        console.log(`[Search Translation Layer] Translated query: "${query}" -> "${translated}"`);
        return translated;
    } catch (error) {
        console.error("Error in Search Translation Layer:", error);
        return query; // Fallback to original query on error
    }
}
