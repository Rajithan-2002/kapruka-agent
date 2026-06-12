import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runSemanticIrrelevanceFilter(
  userIntent: string,
  mappedCategory: string,
  products: { id: string; name: string; category: string }[]
): Promise<string[]> {
  if (products.length === 0) return [];

  // Limit to top 15 products to keep latency extremely low
  const candidates = products.slice(0, 15);
  
  const productListStr = candidates.map(p => `- ID: ${p.id} | Name: ${p.name} | Category: ${p.category}`).join('\n');

  const prompt = `The user is looking for: "${userIntent}" (Mapped Category: ${mappedCategory}).
Here is a list of candidate products returned by a legacy search API:

${productListStr}

Your ONLY job is to identify products that are completely irrelevant to the user's intent. 
For example, if the user wants "food items" or "healthy snacks", a "Toy Fire Truck" or "Fashion Sneakers" is completely irrelevant and should be removed. 
DO NOT rank them or pick the best one. Just filter the garbage.

Return a JSON array of strings containing ONLY the exact IDs of the irrelevant products. If all products are acceptable, return an empty array [].
Respond ONLY with the JSON array. Do not include markdown formatting or backticks.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    const content = response.choices[0].message.content?.trim() || "[]";
    
    // Clean up markdown if LLM disobeyed
    let cleaned = content;
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    
    const irrelevantIds = JSON.parse(cleaned.trim());
    
    if (Array.isArray(irrelevantIds)) {
        return irrelevantIds.map(String);
    }
    return [];
  } catch (error) {
    console.error("Semantic Irrelevance Filter failed:", error);
    return []; // Fail open: if LLM fails, don't drop everything
  }
}
