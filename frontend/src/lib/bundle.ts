// src/lib/bundle.ts

/**
 * Simple bundle generation utility.
 * Given a list of top product recommendations, the occasion and recipient,
 * it creates candidate bundle objects. This is a lightweight implementation
 * that satisfies ALGORITHM 10 – BUNDLE CREATION.
 */
export interface BundleOption {
  items: Array<{ id: string; name: string; price: number }>;
  totalPrice: number;
  description: string;
}

/**
 * Mapping of occasion to complementary product categories.
 * In a real system this would be driven by a catalog service; for now we
 * provide a static map of example categories to combine with the base
 * products.
 */
const OCCASION_BUNDLE_MAP: Record<string, string[]> = {
  birthday: ["flowers", "chocolates"],
  anniversary: ["flowers", "chocolates"],
  apology: ["roses", "chocolates"],
  new_baby: ["baby clothing", "toys"],
  housewarming: ["home goods", "flowers"],
  "mother's day": ["flowers", "chocolates"],
};

/**
 * Generates bundle suggestions.
 * @param topProducts - Array of product objects returned from the search.
 *   Expected shape: { id: string; name: string; price: number }.
 * @param occasion - Detected occasion (e.g., "birthday").
 * @param recipient - Detected recipient (e.g., "mother").
 * @returns An array of BundleOption objects (up to 3 suggestions).
 */
export function generateBundleOptions(
  topProducts: Array<{ id: string; name: string; price: number }>,
  occasion: string | null,
  recipient: string | null
): BundleOption[] {
  const bundles: BundleOption[] = [];
  const complementCategories = OCCASION_BUNDLE_MAP[occasion?.toLowerCase() ?? ""] ?? [];

  // Create a simple bundle for each top product by attaching a fake complementary item.
  for (let i = 0; i < Math.min(3, topProducts.length); i++) {
    const base = topProducts[i];
    const complement = complementCategories[i % complementCategories.length] ?? "gift";

    const complementItem = {
      id: `bundle-${i}-${complement}`,
      name: `${capitalize(complement)} for ${recipient ?? "someone"}`,
      price: Math.round(base.price * 0.2), // assume 20% of base price for demo
    };

    const items = [
      { id: base.id, name: base.name, price: base.price },
      complementItem,
    ];

    const totalPrice = items.reduce((sum, p) => sum + p.price, 0);
    const description = `${base.name} + ${complementItem.name}`;

    bundles.push({ items, totalPrice, description });
  }

  return bundles;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default generateBundleOptions;
