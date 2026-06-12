import { MCPProduct } from "../../mcp";
import { CanonicalProductV1, SchemaValidationError } from "./CanonicalProduct";

export class ProductAdapter {
    /**
     * Converts raw MCP payload to CanonicalProductV1
     */
    public static adaptMCPProduct(raw: MCPProduct): CanonicalProductV1 {
        let priceAmount = 0;
        let currency = "LKR";

        if (raw.price) {
            priceAmount = typeof raw.price.amount === "number" ? raw.price.amount : parseFloat(raw.price.amount as any) || 0;
            if (raw.price.currency) {
                currency = raw.price.currency;
            }
        }

        return {
            id: raw.id,
            name: raw.name || "Unknown Product",
            price: priceAmount,
            currency: currency,
            category: raw.category?.name || "Uncategorized",
            description: raw.summary || "",
            imageUrl: raw.image_url || "",
            image_url: raw.image_url || "",
            inStock: raw.in_stock ?? true,
            url: raw.url || "",
            source: "kapruka_mcp",
            tags: `${raw.name} ${raw.category?.name || ""} ${raw.summary || ""}`
        };
    }

    /**
     * Validates that an array of products conforms to CanonicalProductV1.
     * Throws SchemaValidationError if the contract is violated.
     */
    public static assertCanonicalProducts(products: any[], context: string): asserts products is CanonicalProductV1[] {
        if (!Array.isArray(products)) {
            throw new SchemaValidationError(`[${context}] Expected products to be an array, got ${typeof products}`);
        }

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            if (!p || typeof p !== "object") {
                throw new SchemaValidationError(`[${context}] Product at index ${i} is not an object.`);
            }
            if (!p.id || typeof p.id !== "string") {
                throw new SchemaValidationError(`[${context}] Product at index ${i} missing valid 'id' string. Context: ${JSON.stringify(p)}`);
            }
            if (typeof p.price !== "number" || isNaN(p.price)) {
                throw new SchemaValidationError(`[${context}] Product at index ${i} (${p.id}) missing valid 'price' number.`);
            }
            if (typeof p.category !== "string") {
                throw new SchemaValidationError(`[${context}] Product at index ${i} (${p.id}) missing valid 'category' string.`);
            }
        }
    }

    /**
     * Migration Guard: Safely normalizes ANY product-like object into CanonicalProductV1.
     * Prevents schema corruption from legacy cache, old DB records, etc.
     */
    public static normalizeProduct(raw: any): CanonicalProductV1 {
        let normalizedPrice = 0;
        const pPrice = raw.price !== undefined ? raw.price : raw.product_price;
        
        if (typeof pPrice === "number") {
            normalizedPrice = pPrice;
        } else if (pPrice && typeof pPrice === "object") {
            normalizedPrice = typeof pPrice.amount === "number" ? pPrice.amount : parseFloat(pPrice.amount) || 0;
            if (normalizedPrice === 0 && typeof pPrice.value === "number") {
                normalizedPrice = pPrice.value;
            }
        } else if (typeof pPrice === "string") {
            normalizedPrice = parseFloat(pPrice) || 0;
        }

        return {
            ...raw,
            id: raw.id || raw.product_id || "unknown",
            name: raw.name || raw.product_name || "Unknown Product",
            category: raw.category || raw.product_category || "Uncategorized",
            price: normalizedPrice,
            currency: raw.currency || (raw.price && raw.price.currency) || "LKR",
            url: raw.url || (raw.id ? `https://www.kapruka.com/buyonline/${raw.id}` : ""),
            image_url: raw.image_url || raw.imageUrl || "",
            imageUrl: raw.imageUrl || raw.image_url || "",
            inStock: raw.inStock ?? true
        };
    }
}
