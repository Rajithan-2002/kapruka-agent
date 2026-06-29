import { BaseRule, RuleContext, RuleResult, RulePriority, RuleCategory } from "../../types";

export class SearchProductsRule extends BaseRule {
    name = "SearchProductsRule";
    category: RuleCategory = "shopping";
    priority: RulePriority = "NORMAL";
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;

        if (ue.intent === 'SHOPPING' || ue.intent === 'GIFTING' || ue.intent === 'REORDER' || ue.intent === 'EXPLORATION') {
            const components = [];
            if (ue.product_type && ue.product_type !== 'UNKNOWN') components.push(ue.product_type);
            if (ue.situation?.recipient && ue.situation.recipient !== 'UNKNOWN') components.push(ue.situation.recipient);
            if (ue.situation?.occasion && ue.situation.occasion !== 'UNKNOWN') components.push(ue.situation.occasion);
            
            const query = components.join(" ");

            return {
                matched: true,
                priority: this.priority,
                action: "SEARCH_PRODUCTS",
                reason: "Intent is a shopping action with sufficient context",
                confidence: 0.8,
                mcp_search_query: query || context.message,
                is_reorder: ue.intent === 'REORDER',
                trace: [`[${this.name}] Matched shopping intent. Query generated: ${query}`]
            };
        }

        return this.noMatch("Not a shopping, gifting, or reorder intent.");
    }
}

export class ClarificationRule extends BaseRule {
    name = "ClarificationRule";
    category: RuleCategory = "shopping";
    priority: RulePriority = "HIGH"; // Higher than SearchProductsRule so it overrides if not ready
    ruleVersion = "1.1.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;
        const isShopping = ["SHOPPING", "GIFTING", "REORDER", "BROWSING", "PRICE_REFINEMENT", "PREFERENCE_CORRECTION", "EXPLORATION", "PRODUCT_REJECTION"].includes(ue.intent || "");

        if (isShopping && ue.intelligenceData && !ue.intelligenceData.readyForRecommendation) {
            
            // Missing Information Prioritizer
            const missing = [];
            const sit = ue.situation || {};
            const asked = context.sessionSnapshot?.askedQuestions || [];

            if (!sit.recipient || sit.recipient === "UNKNOWN") {
                if (!asked.includes("recipient")) missing.push({ field: "recipient", p: 100 });
            }
            if (!sit.occasion || sit.occasion === "UNKNOWN") {
                if (!asked.includes("occasion")) missing.push({ field: "occasion", p: 90 });
            }
            if (!sit.budget || !sit.budget.max) {
                if (!asked.includes("budget")) missing.push({ field: "budget", p: 80 });
            }
            if (!sit.deliveryCity || sit.deliveryCity === "UNKNOWN") {
                if (!asked.includes("deliveryCity")) missing.push({ field: "deliveryCity", p: 60 });
            }

            missing.sort((a, b) => b.p - a.p);
            
            if (missing.length === 0) {
                // All missing fields were already asked! Bypass clarification to avoid infinite loop.
                return this.noMatch("All missing fields were already asked. Bypassing to avoid loop.");
            }

            const target = missing[0].field;

            return {
                matched: true,
                priority: this.priority,
                action: "CLARIFY",
                reason: `Missing critical info. Prioritizer selected: ${target}`,
                confidence: 1.0,
                targetField: target,
                trace: [`[${this.name}] readyForRecommendation is false. Missing: ${missing.map(m=>m.field).join(",")}. Asking for ${target}.`]
            };
        }

        return this.noMatch("Ready for recommendation or intelligence data missing.");
    }
}

export class ShowMoreRule extends BaseRule {
    name = "ShowMoreRule";
    category: RuleCategory = "shopping";
    priority: RulePriority = "NORMAL";
    ruleVersion = "1.1.0";

    evaluate(context: RuleContext): RuleResult {
        const action = context.understandingPlan.intelligenceData?.action;
        const ue = context.understandingPlan;
        
        if (action === 'SHOW_MORE' || action === 'RECALL_PREVIOUS_RESULTS' || ue.intent === 'PRICE_REFINEMENT' || ue.intent === 'PREFERENCE_CORRECTION') {
            return {
                matched: true,
                priority: this.priority,
                action: "SHOW_MORE",
                reason: `User requested refinement or show more: action=${action}, intent=${ue.intent}`,
                confidence: 0.9,
                mcp_search_query: context.message,
                detected_intent: action || ue.intent,
                trace: [`[${this.name}] Matched action/intent refinement: ${action || ue.intent}`]
            };
        }

        return this.noMatch("Action is not SHOW_MORE or RECALL_PREVIOUS_RESULTS, and intent is not price/preference refinement.");
    }
}

export class ExploreCategoriesRule extends BaseRule {
    name = "ExploreCategoriesRule";
    category: RuleCategory = "shopping";
    priority: RulePriority = "HIGH";
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;
        const msg = context.message.toLowerCase();

        if (ue.intent === 'BROWSING' || msg.includes("category") || msg.includes("categories") || msg.includes("what gifts") || msg.includes("what can i buy")) {
            return {
                matched: true,
                priority: this.priority,
                action: "EXPLORE_CATEGORIES",
                reason: "User wants to explore available categories",
                confidence: 0.9,
                trace: [`[${this.name}] Matched category exploration query: ${context.message}`]
            };
        }

        return this.noMatch("Not a category exploration request.");
    }
}
