import { RuleResult } from "./types";

export interface RouterDecision {
    mcp_tool_needed: string | null;
    route: string;
    mcp_search_query?: string;
    is_task_cancelled?: boolean;
    is_reorder?: boolean;
    detected_intent?: string;
    is_bundle_requested?: boolean;
    is_context_override?: boolean;
    shopping_stage?: string;
    pending_stages?: string[];
    delivery_city?: string;
    delivery_date?: string;
    recommendation_mode?: string;
    gift_message_needed?: boolean;
    gift_message_tone?: string;
}

export class ActionRouter {
    /**
     * Maps the Rule Engine's output (RuleResult) to the precise payload required by route.ts.
     */
    public static mapDecision(winner: RuleResult | null, fallbackIntent: string): RouterDecision {
        if (!winner) {
            // Ultimate fallback
            return { mcp_tool_needed: null, route: 'bypass' };
        }

        switch (winner.action) {
            case "CLARIFY":
                return { mcp_tool_needed: null, route: 'clarification' };
            case "BYPASS":
                return { mcp_tool_needed: null, route: 'bypass', is_task_cancelled: winner.is_task_cancelled };
            case "TRACK_ORDER":
                return { mcp_tool_needed: 'kapruka_track_order', route: 'tracking', mcp_search_query: winner.mcp_search_query };
            case "SEARCH_PRODUCTS":
                return { 
                    mcp_tool_needed: 'kapruka_search_products', 
                    route: winner.is_reorder ? 'reorder' : 'shopping', 
                    mcp_search_query: winner.mcp_search_query,
                    is_reorder: winner.is_reorder,
                    recommendation_mode: 'recommendation'
                };
            case "EXPLORE_CATEGORIES":
                return { mcp_tool_needed: 'kapruka_list_categories', route: 'explore' };
            case "CHECK_DELIVERY":
                return { mcp_tool_needed: 'kapruka_list_delivery_cities', route: 'delivery_check' };
            case "PRODUCT_DETAIL":
                return { mcp_tool_needed: 'kapruka_get_product', route: 'product_detail', mcp_search_query: winner.mcp_search_query };
            case "CHECKOUT":
                return { mcp_tool_needed: null, route: 'checkout_request', detected_intent: "checkout_request" };
            case "SHOW_MORE":
                return { mcp_tool_needed: 'show_more', route: 'shopping', mcp_search_query: winner.mcp_search_query, detected_intent: winner.detected_intent };
            default:
                return { mcp_tool_needed: null, route: 'bypass' };
        }
    }
}
