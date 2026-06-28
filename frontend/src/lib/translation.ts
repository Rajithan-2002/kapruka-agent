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

    const isAbstractIntent = /gift|present|thank ?you|gratitude|anniversary|birthday|surprise|for my|for him|for her|best/i.test(query);

    // If query is purely ASCII/English and highly concrete, do not call LLM to save latency
    if (!hasSinhalaOrTamil(query) && !isAbstractIntent) {
        return query.trim();
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert e-commerce search query optimizer for Kapruka (a Sri Lankan gift delivery platform).
Your task is to convert the user's raw query into highly effective, tangible search keywords for our product database.

KAPRUKA CATALOG CATEGORIES:
- Cake Shop (Top Sellers, Kapruka Cakes, Javalounge, Ribbon Cakes, Birthday Cakes)
- Chocolates (Ferrero Rocher, Lindt, Sweetbuds, Cadbury, Mars)
- Clothing (Sarees, Dresses, Ladies Tops, T-shirts, Jeans, Gents Wear)
- Electronics (Home Appliances, Computers, Headphones, Smart Watches, Mobile Phones)
- Flower Shop (Royal Bloom, Anniversary Flowers, Birthday Bouquets, Roses, Orchids)
- Grocery Items (Beverages, Canned Food, Confectionery, Dairy, Snacks)
- Jewelry & Watches (Vogue, Swarnamahal, Mallika Hemachandra, Mens/Womens Jewellery)
- Personalized Gifts (Customized Cakes, Mugs, Photo Albums, Gift Sets)
- Fashion & Hand Bags (HandBags, Ladies Shoes, Wallets, Belts, Umbrellas)
- Health & Wellness (Vitamins, Supplements)
- Soft Toys & Kids Toys (Teddy Bears, Bicycles)

RULES:
1. Local Language Translation: If the query is in Sinhala or Singlish/Tamil, translate it to English.
2. Abstract Intent Expansion: If the query is abstract (e.g., "thank you gifts for professor", "anniversary present", "gifts for mom"), you MUST expand it into 3-5 highly concrete, tangible product types that fit the intent based on the catalog above (e.g., "gift set hamper chocolate box perfume mug"). DO NOT return the abstract words "gift" or "present" in the output, as they ruin vector search relevance. 
3. Concrete Queries: If the query is already a specific product (e.g., "chocolate cake", "red roses", "ps5"), just return it as is.
4. Output format: Return ONLY the final keywords separated by spaces. No quotes, no explanations, no commas.`
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
