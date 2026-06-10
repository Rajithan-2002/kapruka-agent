import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export interface PurchaseRecord {
    id: string;
    user_id: string;
    product_id: string;
    product_name: string;
    product_category: string;
    product_price: number;
    action: 'viewed' | 'purchased' | 'reordered' | 'added_to_bundle';
    session_context?: Record<string, any>;
    created_at?: string;
}

/**
 * Tracks an action on a product (viewed, purchased, reordered, added_to_bundle).
 */
export async function trackProductAction(
    userId: string,
    product: { id: string; name: string; category: string; price: number },
    action: 'viewed' | 'purchased' | 'reordered' | 'added_to_bundle',
    sessionContext?: Record<string, any>
): Promise<void> {
    if (!useCloud || !supabase) {
        console.log(`[Local fallback] Tracked ${action} for product: ${product.name}`);
        return;
    }

    const id = `pur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { error } = await supabase.from("purchase_history").insert({
        id,
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_price: product.price,
        action,
        session_context: sessionContext || {}
    });

    if (error) {
        console.error("Error tracking product action:", error);
    }
}

/**
 * Gets the recent purchase history for a user.
 */
export async function getPurchaseHistory(
    userId: string,
    limit: number = 50
): Promise<PurchaseRecord[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("purchase_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching purchase history:", error);
        return [];
    }

    return (data || []) as PurchaseRecord[];
}

/**
 * Searches the purchase history for past purchases matching a query (e.g. "water bottle").
 */
export async function searchPurchases(
    userId: string,
    query: string,
    limit: number = 10
): Promise<PurchaseRecord[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("purchase_history")
        .select("*")
        .eq("user_id", userId)
        .ilike("product_name", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error searching purchases:", error);
        return [];
    }

    return (data || []) as PurchaseRecord[];
}

/**
 * Gets candidate products that are ripe for reordering.
 * These are products purchased or reordered multiple times, or frequently added.
 */
export async function getReorderCandidates(
    userId: string
): Promise<Array<{ product_id: string; product_name: string; product_category: string; product_price: number; purchase_count: number }>> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("purchase_history")
        .select("product_id, product_name, product_category, product_price, action")
        .eq("user_id", userId)
        .in("action", ["purchased", "reordered"]);

    if (error) {
        console.error("Error getting reorder candidates:", error);
        return [];
    }

    const counts: Record<string, { name: string; category: string; price: number; count: number }> = {};
    (data || []).forEach(record => {
        if (!counts[record.product_id]) {
            counts[record.product_id] = {
                name: record.product_name,
                category: record.product_category,
                price: record.product_price,
                count: 0
            };
        }
        counts[record.product_id].count++;
    });

    return Object.entries(counts).map(([productId, info]) => ({
        product_id: productId,
        product_name: info.name,
        product_category: info.category,
        product_price: info.price,
        purchase_count: info.count
    })).sort((a, b) => b.purchase_count - a.purchase_count);
}
