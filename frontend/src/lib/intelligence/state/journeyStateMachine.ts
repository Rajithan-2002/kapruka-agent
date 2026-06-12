export type JourneyState = 
    | "IDLE" 
    | "GIFT_DISCOVERY" 
    | "RECIPIENT_CAPTURED" 
    | "OCCASION_CAPTURED" 
    | "BUDGET_CAPTURED" 
    | "RECOMMENDING" 
    | "BUNDLE_BUILDING" 
    | "DELIVERY_CHECKING" 
    | "CHECKOUT_READY" 
    | "ORDER_COMPLETE" 
    | "TRACKING" 
    | "REORDERING";

export type JourneyEvent = 
    | "START_GIFT_SEARCH"
    | "RECIPIENT_IDENTIFIED"
    | "OCCASION_IDENTIFIED"
    | "BUDGET_IDENTIFIED"
    | "RECOMMENDATIONS_FOUND"
    | "BUNDLE_CREATED"
    | "DELIVERY_CONFIRMED"
    | "PROCEED_TO_CHECKOUT"
    | "ORDER_SUCCESSFUL"
    | "START_TRACKING"
    | "START_REORDER"
    | "RESET";

export class JourneyStateMachine {
    private currentState: JourneyState;

    constructor(initialState: JourneyState = "IDLE") {
        this.currentState = initialState;
    }

    public getCurrentState(): JourneyState {
        return this.currentState;
    }

    public transition(event: JourneyEvent): JourneyState {
        const previousState = this.currentState;
        
        switch (this.currentState) {
            case "IDLE":
                if (event === "START_GIFT_SEARCH") this.currentState = "GIFT_DISCOVERY";
                else if (event === "START_TRACKING") this.currentState = "TRACKING";
                else if (event === "START_REORDER") this.currentState = "REORDERING";
                break;
            case "GIFT_DISCOVERY":
                if (event === "RECIPIENT_IDENTIFIED") this.currentState = "RECIPIENT_CAPTURED";
                break;
            case "RECIPIENT_CAPTURED":
                if (event === "OCCASION_IDENTIFIED") this.currentState = "OCCASION_CAPTURED";
                else if (event === "BUDGET_IDENTIFIED") this.currentState = "BUDGET_CAPTURED";
                break;
            case "OCCASION_CAPTURED":
                if (event === "BUDGET_IDENTIFIED") this.currentState = "BUDGET_CAPTURED";
                else if (event === "RECOMMENDATIONS_FOUND") this.currentState = "RECOMMENDING";
                break;
            case "BUDGET_CAPTURED":
                if (event === "RECOMMENDATIONS_FOUND") this.currentState = "RECOMMENDING";
                break;
            case "RECOMMENDING":
                if (event === "BUNDLE_CREATED") this.currentState = "BUNDLE_BUILDING";
                else if (event === "DELIVERY_CONFIRMED") this.currentState = "DELIVERY_CHECKING";
                break;
            case "BUNDLE_BUILDING":
                if (event === "DELIVERY_CONFIRMED") this.currentState = "DELIVERY_CHECKING";
                else if (event === "PROCEED_TO_CHECKOUT") this.currentState = "CHECKOUT_READY";
                break;
            case "DELIVERY_CHECKING":
                if (event === "PROCEED_TO_CHECKOUT") this.currentState = "CHECKOUT_READY";
                break;
            case "CHECKOUT_READY":
                if (event === "ORDER_SUCCESSFUL") this.currentState = "ORDER_COMPLETE";
                break;
            case "ORDER_COMPLETE":
            case "TRACKING":
            case "REORDERING":
                if (event === "RESET") this.currentState = "IDLE";
                break;
        }

        // Always allow a hard reset
        if (event === "RESET") this.currentState = "IDLE";

        return this.currentState;
    }
}
