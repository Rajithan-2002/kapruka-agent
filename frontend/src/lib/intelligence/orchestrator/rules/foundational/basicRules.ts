import { BaseRule, RuleContext, RuleResult, RulePriority, RuleCategory } from "../../types";

export class TrackOrderRule extends BaseRule {
    name = "TrackOrderRule";
    category: RuleCategory = "tracking";
    priority: RulePriority = "HIGH";
    ruleVersion = "1.0.0";

    evaluate(context: RuleContext): RuleResult {
        const ue = context.understandingPlan;
        
        if (ue.intent === 'TRACK_ORDER') {
            return {
                matched: true,
                priority: this.priority,
                action: "TRACK_ORDER",
                reason: "User explicitly asked to track an order",
                confidence: 1.0,
                mcp_search_query: context.message,
                trace: [`[${this.name}] Intent matched TRACK_ORDER`]
            };
        }

        return this.noMatch("Intent is not TRACK_ORDER");
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
