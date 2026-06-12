import { BaseRule, RuleContext, RuleResult, RulePriority, RuleCategory } from "../../types";

export class TrackOrderRule extends BaseRule {
    name = "TrackOrderRule";
    category: RuleCategory = "tracking";
    priority: RulePriority = "HIGH";
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;
        const msgLower = context.message.toLowerCase();
        
        const isTrackingIntent = 
            ue.intent === 'TRACK_ORDER' || 
            ue.intent === 'TRACKING' || 
            msgLower.includes('track') || 
            /vimp[0-9a-z]+/i.test(context.message) ||
            /kp[0-9]+/i.test(context.message);
        
        if (isTrackingIntent) {
            const words = context.message.split(/\s+/);
            let orderNumber = "";
            
            // Look for VIMP... or KP... format order reference
            for (const word of words) {
                const cleanWord = word.replace(/[^A-Za-z0-9]/g, '');
                if (/^(?:VIMP|KP)[A-Z0-9]+$/i.test(cleanWord)) {
                    orderNumber = cleanWord;
                    break;
                }
            }
            
            // Fallback: any uppercase-dominant alphanumeric token of length 8-15
            if (!orderNumber) {
                for (const word of words) {
                    const cleanWord = word.replace(/[^A-Za-z0-9]/g, '');
                    if (cleanWord.length >= 6 && /^[A-Z0-9]+$/i.test(cleanWord) && !/^[0-9]+$/.test(cleanWord) && !/^[A-Z]+$/i.test(cleanWord)) {
                        orderNumber = cleanWord;
                        break;
                    }
                }
            }

            // Fallback: last word in the query
            if (!orderNumber && words.length > 0) {
                const lastWord = words[words.length - 1].replace(/[^A-Za-z0-9]/g, '');
                if (lastWord.length >= 4) {
                    orderNumber = lastWord;
                }
            }

            return {
                matched: true,
                priority: this.priority,
                action: "TRACK_ORDER",
                reason: "User explicitly asked to track an order",
                confidence: 1.0,
                mcp_search_query: orderNumber || context.message,
                trace: [`[${this.name}] Intent matched tracking with order number: ${orderNumber || context.message}`]
            };
        }

        return this.noMatch("Intent is not tracking");
    }
}

export class BypassRule extends BaseRule {
    name = "BypassRule";
    category: RuleCategory = "bypass";
    priority: RulePriority = "LOW";
    ruleVersion = "1.0.0";

    private NON_SHOPPING_INTENTS = [
        "GREETING", "SMALL_TALK", "FRUSTRATION", "COMPLAINT", "GRATITUDE",
        "ACKNOWLEDGMENT", "CANCELLATION", "PARTIAL_CONTEXT", "AMBIGUOUS",
        "OBSERVATION", "CAPABILITY_QUESTION", "FEEDBACK", "EMPTY_OR_TEST", "ORDER_ISSUE"
    ];

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;

        if (this.NON_SHOPPING_INTENTS.includes(ue.intent)) {
            const isCancel = ue.intent === 'CANCELLATION';
            return {
                matched: true,
                priority: this.priority,
                action: "BYPASS",
                reason: `Non-shopping intent detected: ${ue.intent}`,
                confidence: 0.9,
                is_task_cancelled: isCancel,
                trace: [`[${this.name}] Matched non-shopping intent: ${ue.intent}`]
            };
        }

        return this.noMatch("Intent requires orchestration (is a shopping/action intent)");
    }
}
