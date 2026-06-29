import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runSemanticIrrelevanceFilter(
  userIntent: string,
  mappedCategory: string,
  products: { id: string; name: string; category: string }[],
  searchMode: "EXPLORATORY" | "PRECISE" = "PRECISE",
  specificityScore: number = 1.0
): Promise<{ irrelevantIds: string[]; metrics: any }> {
  if (products.length === 0) {
    return { irrelevantIds: [], metrics: null };
  }

  // Adaptive Semantic Window
  let windowSize = 15;
  if (specificityScore < 0.5) {
      windowSize = 50;
  } else if (specificityScore < 0.8) {
      windowSize = 30;
  }

  const candidates = products.slice(0, windowSize);
  
  const productListStr = candidates.map(p => `- ID: ${p.id} | Name: ${p.name} | Category: ${p.category}`).join('\n');

  let prompt = `The user is looking for: "${userIntent}" (Mapped Category: ${mappedCategory}).
Here is a list of candidate products returned by a legacy search API:

${productListStr}

Your ONLY job is to identify products that are completely irrelevant to the user's intent. 
`;

  if (searchMode === "EXPLORATORY") {
      prompt += `
BROAD SEARCH MODE:
The user is making an exploratory search (e.g., "gift", "graduation", "birthday"). 
You must be VERY FORGIVING. Do not aggressively drop products unless they are completely nonsensical for this context. Keep as many products as possible to give the user diverse ideas.
`;
  } else {
      prompt += `
STRICT SEARCH MODE:
For example, if the user wants "food items" or "healthy snacks", a "Toy Fire Truck" or "Fashion Sneakers" is completely irrelevant and should be removed. 

CRITICAL KEYWORD HIJACKING RULE: 
If the user is asking for a consumable or simple item (e.g., "Juice", "Coffee"), you MUST aggressively remove appliances, dispensers, or accessories (e.g., "Juice Blender", "Coffee Machine") unless the user explicitly asked for machines/appliances. Keyword matching alone is not enough; the intent must match the physical product type.
`;
  }

  prompt += `
DO NOT rank them or pick the best one. Just filter the garbage.

Return a JSON array of strings containing ONLY the exact IDs of the irrelevant products. If all products are acceptable, return an empty array [].
Respond ONLY with the JSON array. Do not include markdown formatting or backticks.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 250,
    });

    const content = response.choices[0].message.content?.trim() || "[]";
    
    // Clean up markdown if LLM disobeyed
    let cleaned = content;
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    
    const irrelevantIds = JSON.parse(cleaned.trim());
    
    if (Array.isArray(irrelevantIds)) {
        const ids = irrelevantIds.map(String);
        
        const metrics = {
            retrieved: candidates.length,
            removed: ids.length,
            kept: candidates.length - ids.length,
            survivalPercentage: candidates.length > 0 ? ((candidates.length - ids.length) / candidates.length * 100).toFixed(2) + "%" : "0%",
            searchMode,
            specificityScore,
            windowSize
        };
        
        return { irrelevantIds: ids, metrics };
    }
    return { irrelevantIds: [], metrics: null };
  } catch (error) {
    console.error("Semantic Irrelevance Filter failed:", error);
    return { irrelevantIds: [], metrics: null }; // Fail open
  }
}
