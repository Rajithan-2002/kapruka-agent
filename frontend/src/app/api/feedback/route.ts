import { NextResponse } from "next/server";
import { submitFeedback, logCommunityAction } from "@/lib/intelligence/feedback/feedbackService";
import { CommunityFeedbackEngine } from "@/lib/intelligence/feedback/communityFeedbackEngine";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productId, context, feedbackType, userId, sessionId } = body;

        if (!productId || !context || !feedbackType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const contextKey = CommunityFeedbackEngine.generateContextKey(
            context.recipient,
            context.occasion,
            context.category,
            context.strategy
        );

        const effectiveUserId = userId && userId !== "guest"
            ? userId
            : (sessionId ? `guest_${sessionId}` : null);

        await submitFeedback(
            effectiveUserId,
            productId,
            contextKey,
            context.recipient || "unknown",
            context.occasion || "unknown",
            context.category || "unknown",
            context.strategy || "unknown",
            feedbackType
        );

        // Log action as 'like' or 'dislike' in community analytics
        const communityAction = feedbackType === "RELEVANT" ? "like" : "dislike";
        await logCommunityAction(
            effectiveUserId,
            productId,
            communityAction,
            context.recipient || "unknown",
            context.occasion || "unknown",
            null // Budget range is not available in feedback context
        );

        // Wire feedback into the affinity learning engine
        if (effectiveUserId && context.category) {
            try {
                const { AffinityEngine } = await import("@/lib/intelligence/recommendation/affinityEngine");
                const affinityAction = feedbackType === "RELEVANT" ? "CLICK" : "EXPLICIT_DISLIKE";
                await AffinityEngine.recordInteraction(effectiveUserId, "category", context.category, affinityAction);

                // Log user rating clicks / feedback telemetry to learning_events
                const { LearningEngine } = await import("@/lib/intelligence/learning/learningEngine");
                const eventType = feedbackType === "RELEVANT" ? "POSITIVE_SIGNAL" : "NEGATIVE_SIGNAL";
                await LearningEngine.recordFeedback(
                    effectiveUserId,
                    eventType,
                    {
                        productId,
                        contextKey,
                        recipient: context.recipient || "unknown",
                        occasion: context.occasion || "unknown",
                        category: context.category
                    }
                );
            } catch (err) {
                console.warn("[Feedback] AffinityEngine/LearningEngine update failed (non-critical):", err);
            }
        }

        return NextResponse.json({ success: true, contextKey });
    } catch (error: any) {
        console.error("Feedback API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
