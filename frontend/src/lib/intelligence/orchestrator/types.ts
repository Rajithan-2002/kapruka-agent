export type RulePriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export type RuleCategory = "shopping" | "delivery" | "checkout" | "tracking" | "reorder" | "memory" | "bypass";

export type ActionType = 
    | "CLARIFY" 
    | "BYPASS" 
    | "TRACK_ORDER" 
    | "SEARCH_PRODUCTS" 
    | "EXPLORE_CATEGORIES" 
    | "CHECK_DELIVERY" 
    | "PRODUCT_DETAIL" 
    | "CHECKOUT" 
    | "SHOW_MORE";

export interface ActionResult {
    success: boolean;
    errorCode?: string;
    fallbackAction?: ActionType;
}

export interface RuleResult {
    matched: boolean;
    priority: RulePriority;
    action: ActionType;
    reason: string;
    confidence: number;
    trace: string[];
    decisionId?: string;
    // Additional parameters required by ActionRouter
    mcp_search_query?: string;
    is_reorder?: boolean;
    is_task_cancelled?: boolean;
    detected_intent?: string;
}

export interface RuleContext {
    understandingPlan: any;
    journeyState: any;
    sessionSnapshot: any;
    message: string;
}

export abstract class BaseRule {
    abstract readonly name: string;
    abstract readonly category: RuleCategory;
    abstract readonly priority: RulePriority;
    abstract readonly ruleVersion: string;

    /**
     * Evaluates the rule against the current context.
     * Must return a strict RuleResult.
     */
    abstract evaluate(context: RuleContext): RuleResult;

    protected priorityValue(priority: RulePriority): number {
        switch (priority) {
            case "CRITICAL": return 400;
            case "HIGH": return 300;
            case "NORMAL": return 200;
            case "LOW": return 100;
        }
    }

    protected noMatch(reason: string): RuleResult {
        return {
            matched: false,
            priority: this.priority,
            action: "BYPASS",
            reason,
            confidence: 0,
            trace: [`[${this.name}] did not match: ${reason}`]
        };
    }
}
