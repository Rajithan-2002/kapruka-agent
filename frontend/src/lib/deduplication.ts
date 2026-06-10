export interface ProductLike {
    id: string;
    name: string;
    url: string;
    price: number;
    score?: number;
    [key: string]: any;
}

/**
 * Normalizes a product name for fuzzy duplication comparison (stripping spaces, symbols, and cases).
 */
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // remove all non-alphanumeric characters
        .trim();
}

/**
 * Deduplicates a list of products by ID, URL, and normalized Name.
 * Retains the duplicate item with the highest score.
 */
export function deduplicateProducts<T extends ProductLike>(products: T[], contextLabel = "Search/Recommendations"): T[] {
    if (!products || products.length === 0) return [];

    const totalCount = products.length;
    const uniqueMap = new Map<string, T>();
    const seenNames = new Map<string, string>(); // normalized_name -> product_id
    const seenUrls = new Map<string, string>();  // url -> product_id

    // Sort products by score descending (highest score first) to guarantee we keep the best one
    const sortedProducts = [...products].sort((a, b) => (b.score || 0) - (a.score || 0));

    for (const item of sortedProducts) {
        const id = item.id;
        const normName = normalizeName(item.name);
        const url = item.url;

        // Check if ID is already registered
        if (uniqueMap.has(id)) {
            continue;
        }

        // Check if Name is near-identical to an already seen product
        if (seenNames.has(normName)) {
            continue;
        }

        // Check if URL is already seen
        if (seenUrls.has(url)) {
            continue;
        }

        // Add to map
        uniqueMap.set(id, item);
        seenNames.set(normName, id);
        seenUrls.set(url, id);
    }

    const result = Array.from(uniqueMap.values());
    const duplicatesRemoved = totalCount - result.length;

    console.log(`[Deduplication Engine - ${contextLabel}]
- Total products received: ${totalCount}
- Duplicates removed: ${duplicatesRemoved}
- Final products remaining: ${result.length}`);

    return result;
}
