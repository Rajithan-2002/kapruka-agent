import { BaseRule, RuleContext, RuleResult, RulePriority } from "./types";

import { FeatureFlags } from "../config/featureFlags";

export interface EngineExecutionTrace {
    decisionId: string;
    evaluatedRules: Array<{ rule: string; matched: boolean; priority: RulePriority; confidence: number; reason: string }>;
    selectedRule: string | null;
    action: string | null;
}

export class RuleEngine {
    private rules: BaseRule[] = [];

    public registerRule(rule: BaseRule) {
        this.rules.push(rule);
    }

    public evaluate(context: RuleContext): { winner: RuleResult | null, trace: EngineExecutionTrace } {
        const decisionId = `dec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const trace: EngineExecutionTrace = {
            decisionId,
            evaluatedRules: [],
            selectedRule: null,
            action: null
        };

        if (!FeatureFlags.ENABLE_RULE_ENGINE) {
            trace.evaluatedRules.push({
                rule: "FeatureFlagCheck",
                matched: false,
                priority: "CRITICAL",
                confidence: 1.0,
                reason: "ENABLE_RULE_ENGINE is false"
            });
            return { winner: null, trace };
        }

        // Context Freeze Layer: Deep clone to prevent mid-flight mutation bugs
        const frozenContext: RuleContext = JSON.parse(JSON.stringify(context));

        const matches: RuleResult[] = [];

        // Exhaustive Evaluation
        for (const rule of this.rules) {
            try {
                const result = rule.evaluate(frozenContext);
                trace.evaluatedRules.push({
                    rule: rule.name,
                    matched: result.matched,
                    priority: result.priority,
                    confidence: result.confidence,
                    reason: result.reason
                });

                if (result.matched) {
                    matches.push(result);
                }
            } catch (e: any) {
                console.error(`Error evaluating rule ${rule.name}:`, e);
            }
        }

        if (matches.length === 0) {
            return { winner: null, trace };
        }

        // Sort by Priority then Confidence
        matches.sort((a, b) => {
            const pDiff = this.priorityValue(b.priority) - this.priorityValue(a.priority);
            if (pDiff !== 0) return pDiff;
            return b.confidence - a.confidence;
        });

        const winner = matches[0];
        winner.decisionId = decisionId;
        trace.selectedRule = (winner as any).name || (winner.trace[0] ? winner.trace[0].split("]")[0].replace("[", "") : "UnknownRule");
        trace.action = winner.action;

        return { winner, trace };
    }

    private priorityValue(priority: RulePriority): number {
        switch (priority) {
            case "CRITICAL": return 400;
            case "HIGH": return 300;
            case "NORMAL": return 200;
            case "LOW": return 100;
        }
    }
}
