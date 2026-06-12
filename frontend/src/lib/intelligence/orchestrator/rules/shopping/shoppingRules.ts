import { BaseRule, RuleContext, RuleResult, RulePriority, RuleCategory } from "../../types";

export class SearchProductsRule extends BaseRule {
    name = "SearchProductsRule";
    category: RuleCategory = "shopping";
    priority: RulePriority = "NORMAL";
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;

        if (ue.intent === 'SHOPPING' || ue.intent === 'GIFTING' || ue.intent === 'REORDER') {
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

        if (ue.intelligenceData && !ue.intelligenceData.readyForRecommendation) {
            
            // Missing Information Prioritizer
            const missing = [];
            const sit = ue.situation || {};
            if (!sit.recipient || sit.recipient === "UNKNOWN") missing.push({ field: "recipient", p: 100 });
            if (!sit.occasion || sit.occasion === "UNKNOWN") missing.push({ field: "occasion", p: 90 });
            if (!sit.budget || !sit.budget.max) missing.push({ field: "budget", p: 80 });
            if (!sit.deliveryCity || sit.deliveryCity === "UNKNOWN") missing.push({ field: "deliveryCity", p: 60 });

            missing.sort((a, b) => b.p - a.p);
            
            const target = missing.length > 0 ? missing[0].field : "general";

            return {
                matched: true,
                priority: this.priority,
                action: "CLARIFY",
                reason: `Missing critical info. Prioritizer selected: ${target}`,
                confidence: 1.0,
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
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const action = context.understandingPlan.intelligenceData?.action;
        
        if (action === 'SHOW_MORE' || action === 'RECALL_PREVIOUS_RESULTS') {
            return {
                matched: true,
                priority: this.priority,
                action: "SHOW_MORE",
                reason: `User explicitly requested: ${action}`,
                confidence: 0.9,
                mcp_search_query: context.message,
                detected_intent: action,
                trace: [`[${this.name}] Matched action: ${action}`]
            };
        }

        return this.noMatch("Action is not SHOW_MORE or RECALL_PREVIOUS_RESULTS.");
    }
}
