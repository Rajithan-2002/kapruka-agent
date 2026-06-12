import { createClient } from "@supabase/supabase-js";
import { FeedbackStats } from "./communityFeedbackEngine";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export async function submitFeedback(
    userId: string | null,
    productId: string,
    contextKey: string,
    recipient: string,
    occasion: string,
    category: string,
    strategy: string,
    feedbackType: "RELEVANT" | "NOT_RELEVANT"
): Promise<void> {
    if (!useCloud || !supabase) return;

    const isGuest = !userId || userId === "00000000-0000-0000-0000-000000000000" || userId === "guest-123";

    try {
        let previousFeedbackType: string | null = null;

        if (!isGuest) {
            // Check for existing vote from this user
            const { data: previousVote } = await supabase
                .from("product_feedback")
                .select("*")
                .eq("user_id", userId)
                .eq("product_id", productId)
                .eq("recipient", recipient)
                .eq("occasion", occasion)
                .eq("category", category)
                .eq("strategy", strategy)
                .maybeSingle();

            if (previousVote) {
                if (previousVote.feedback_type === feedbackType) {
                    // User clicked the exact same vote, ignore it
                    return;
                } else {
                    // User flipped their vote
                    previousFeedbackType = previousVote.feedback_type;
                    await supabase.from("product_feedback").update({
                        feedback_type: feedbackType
                    }).eq("id", previousVote.id);
                }
            } else {
                // New vote
                await supabase.from("product_feedback").insert({
                    user_id: userId,
                    product_id: productId,
                    recipient,
                    occasion,
                    category,
                    strategy,
                    context_key: contextKey,
                    feedback_type: feedbackType
                });
            }
        } else {
            // Guest users only log the raw event, they do not update community scores
            await supabase.from("product_feedback").insert({
                user_id: userId,
                product_id: productId,
                recipient,
                occasion,
                category,
                strategy,
                context_key: contextKey,
                feedback_type: feedbackType
            });
            return;
        }

        // 2. Update the aggregated scores
        const { data: existing } = await supabase
            .from("community_relevance_scores")
            .select("*")
            .eq("context_key", contextKey)
            .eq("product_id", productId)
            .single();

        let posVotes = existing?.positive_votes || 0;
        let negVotes = existing?.negative_votes || 0;

        // If they flipped their vote, remove the old one
        if (previousFeedbackType === "RELEVANT") posVotes = Math.max(0, posVotes - 1);
        if (previousFeedbackType === "NOT_RELEVANT") negVotes = Math.max(0, negVotes - 1);

        if (feedbackType === "RELEVANT") posVotes++;
        else negVotes++;

        const totalVotes = posVotes + negVotes;
        const score = totalVotes > 0 ? posVotes / totalVotes : 1.0;

        await supabase.from("community_relevance_scores").upsert({
            context_key: contextKey,
            product_id: productId,
            positive_votes: posVotes,
            negative_votes: negVotes,
            community_score: score,
            last_updated: new Date().toISOString()
        }, { onConflict: "context_key, product_id" });

    } catch (err) {
        console.error("Error saving community feedback:", err);
    }
}

export async function getCommunityScores(productIds: string[], contextKey: string): Promise<Record<string, FeedbackStats>> {
    if (!useCloud || !supabase || productIds.length === 0) return {};

    try {
        const { data } = await supabase
            .from("community_relevance_scores")
            .select("product_id, positive_votes, negative_votes, last_updated")
            .eq("context_key", contextKey)
            .in("product_id", productIds);

        const result: Record<string, FeedbackStats> = {};
        if (data) {
            data.forEach(row => {
                result[row.product_id] = {
                    positiveVotes: row.positive_votes,
                    negativeVotes: row.negative_votes,
                    totalVotes: row.positive_votes + row.negative_votes,
                    last_updated: row.last_updated
                };
            });
        }
        return result;
    } catch (err) {
        console.error("Error fetching community scores:", err);
        return {};
    }
}
