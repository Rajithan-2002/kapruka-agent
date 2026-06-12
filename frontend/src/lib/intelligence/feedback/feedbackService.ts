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

export async function getV15CommunityScores(
    productIds: string[],
    contextKey: string,
    recipient: string,
    occasion: string
): Promise<Record<string, { likeRate: number; purchaseRate: number; bundleRate: number; score: number }>> {
    const result: Record<string, { likeRate: number; purchaseRate: number; bundleRate: number; score: number }> = {};
    
    // Set defaults
    productIds.forEach(id => {
        result[id] = { likeRate: 0.5, purchaseRate: 0.0, bundleRate: 0.0, score: 0.5 };
    });

    if (!useCloud || !supabase || productIds.length === 0) return result;

    try {
        // 1. Fetch votes from community_relevance_scores
        const { data: voteData } = await supabase
            .from("community_relevance_scores")
            .select("product_id, positive_votes, negative_votes")
            .eq("context_key", contextKey)
            .in("product_id", productIds);

        const votesMap: Record<string, { pos: number; neg: number }> = {};
        if (voteData) {
            voteData.forEach(row => {
                votesMap[row.product_id] = { pos: row.positive_votes, neg: row.negative_votes };
            });
        }

        // 2. Fetch action counts from community_analytics
        const { data: actionData } = await supabase
            .from("community_analytics")
            .select("product_id, action")
            .eq("relationship_type", recipient.toLowerCase())
            .eq("occasion_type", occasion.toLowerCase())
            .in("product_id", productIds);

        const countsMap: Record<string, { view: number; expand: number; like: number; dislike: number; bundle_add: number; purchase: number; total: number }> = {};
        productIds.forEach(id => {
            countsMap[id] = { view: 0, expand: 0, like: 0, dislike: 0, bundle_add: 0, purchase: 0, total: 0 };
        });

        if (actionData) {
            actionData.forEach(row => {
                const pid = row.product_id;
                const act = row.action;
                if (countsMap[pid]) {
                    if (act === "view") countsMap[pid].view++;
                    else if (act === "expand") countsMap[pid].expand++;
                    else if (act === "like") countsMap[pid].like++;
                    else if (act === "dislike") countsMap[pid].dislike++;
                    else if (act === "bundle_add") countsMap[pid].bundle_add++;
                    else if (act === "purchase") countsMap[pid].purchase++;
                    countsMap[pid].total++;
                }
            });
        }

        // 3. Compute final COMMUNITY_SCORE
        productIds.forEach(id => {
            const votes = votesMap[id] || { pos: 0, neg: 0 };
            const actions = countsMap[id];

            // Like Rate
            let likeRate = 0.5; // neutral default
            const totalVotes = votes.pos + votes.neg + actions.like + actions.dislike;
            const posVotes = votes.pos + actions.like;
            if (totalVotes > 0) {
                likeRate = posVotes / totalVotes;
            }

            // Purchase Rate
            let purchaseRate = 0.0;
            if (actions.total > 0) {
                purchaseRate = actions.purchase / actions.total;
            }

            // Bundle Rate
            let bundleRate = 0.0;
            if (actions.total > 0) {
                bundleRate = actions.bundle_add / actions.total;
            }

            const score = (likeRate * 0.4) + (purchaseRate * 0.4) + (bundleRate * 0.2);
            result[id] = { likeRate, purchaseRate, bundleRate, score };
        });

    } catch (err) {
        console.error("Error fetching V1.5 community scores:", err);
    }

    return result;
}

export async function getTrendScores(productIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    productIds.forEach(id => { result[id] = 0.5; }); // Default to 0.5 (neutral)
    
    if (!useCloud || !supabase || productIds.length === 0) return result;

    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data } = await supabase
            .from("community_analytics")
            .select("product_id")
            .gte("created_at", oneWeekAgo.toISOString())
            .in("product_id", productIds);

        const counts: Record<string, number> = {};
        let maxCount = 0;
        if (data) {
            data.forEach(row => {
                counts[row.product_id] = (counts[row.product_id] || 0) + 1;
                if (counts[row.product_id] > maxCount) {
                    maxCount = counts[row.product_id];
                }
            });
        }

        productIds.forEach(id => {
            if (maxCount > 0) {
                const count = counts[id] || 0;
                result[id] = 0.5 + 0.5 * (count / maxCount);
            } else {
                result[id] = 0.5;
            }
        });
    } catch (err) {
        console.error("Error calculating trend scores:", err);
    }
    return result;
}

export async function logCommunityAction(
    userId: string | null,
    productId: string,
    action: 'view' | 'expand' | 'like' | 'dislike' | 'bundle_add' | 'purchase',
    relationshipType?: string | null,
    occasionType?: string | null,
    budgetRange?: string | null
): Promise<void> {
    if (!useCloud || !supabase) {
        console.log(`[Local Analytics Fallback] Action: ${action}, Product: ${productId}, Context: ${relationshipType || 'none'}/${occasionType || 'none'}/${budgetRange || 'none'}`);
        return;
    }
    
    // Normalize guest user IDs
    const cleanUserId = !userId || userId === "00000000-0000-0000-0000-000000000000" || userId.startsWith("guest")
        ? null
        : userId;

    try {
        const { error } = await supabase.from("community_analytics").insert({
            user_id: cleanUserId,
            product_id: productId,
            action,
            relationship_type: relationshipType?.toLowerCase() || null,
            occasion_type: occasionType?.toLowerCase() || null,
            budget_range: budgetRange || null
        });

        if (error) {
            console.error("Error inserting community action:", error.message);
        }
    } catch (err) {
        console.error("Error logging community action:", err);
    }
}

