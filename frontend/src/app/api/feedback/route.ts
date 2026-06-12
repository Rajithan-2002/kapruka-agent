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

        return NextResponse.json({ success: true, contextKey });
    } catch (error: any) {
        console.error("Feedback API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
