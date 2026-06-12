export const CATEGORY_ALIASES: Record<string, string[]> = {
    mugs: ["mug", "coffee mug", "tea mug", "ceramic mug", "cup", "cups"],
    books: ["book", "novel", "reading material", "notebook"],
    flowers: ["flower", "bouquet", "roses", "lily", "lilies", "orchid"],
    cakes: ["cake", "cupcake", "gateau", "chocolate cake"],
    jewelry: ["necklace", "ring", "earrings", "bracelet", "jewellery"],
    clothes: ["clothing", "shirt", "t-shirt", "dress", "saree", "kurti", "trousers", "pants", "shoes"],
    chocolates: ["chocolate", "chocolates", "candy", "sweets"],
    hampers: ["hamper", "gift box", "gift basket"],
    toys: ["toy", "plush", "teddy", "soft toy", "action figure", "doll"],
    perfume: ["perfumes", "fragrance", "cologne", "body spray"]
};

/**
 * Given a user's target rejection string (e.g. "cups"), this attempts to find 
 * all associated aliases or the master category so we can broadly filter.
 */
export function getCategoryAliases(target: string): string[] {
    const normalizedTarget = target.toLowerCase().trim();
    const result = new Set<string>();
    result.add(normalizedTarget);

    // If it's a key, add all its aliases
    if (CATEGORY_ALIASES[normalizedTarget]) {
        CATEGORY_ALIASES[normalizedTarget].forEach(a => result.add(a));
    }

    // If it's an alias, add the key and all sibling aliases
    for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
        if (aliases.includes(normalizedTarget)) {
            result.add(key);
            aliases.forEach(a => result.add(a));
        }
    }

    return Array.from(result);
}
