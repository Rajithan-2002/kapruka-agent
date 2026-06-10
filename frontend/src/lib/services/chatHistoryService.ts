import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export interface ChatRecord {
    id: string;
    user_id: string;
    session_id: string;
    role: "user" | "assistant";
    content: string;
    metadata?: Record<string, unknown>;
    created_at?: string;
}

/**
 * Save a single chat message to the database.
 */
export async function saveChatMessage(
    userId: string,
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    if (!useCloud || !supabase) return;

    const id = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { error } = await supabase.from("chat_history").insert({
        id,
        user_id: userId,
        session_id: sessionId,
        role,
        content,
        metadata: metadata || {}
    });

    if (error) {
        console.error("Error saving chat message:", error);
    }
}

/**
 * Get recent chat history for a user (for reorder detection, context recall).
 * Returns the last N messages across all sessions.
 */
export async function getRecentChatHistory(
    userId: string,
    limit: number = 50
): Promise<ChatRecord[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching chat history:", error);
        return [];
    }

    return (data || []) as ChatRecord[];
}

/**
 * Get chat history for a specific session.
 */
export async function getSessionHistory(
    userId: string,
    sessionId: string
): Promise<ChatRecord[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching session history:", error);
        return [];
    }

    return (data || []) as ChatRecord[];
}

/**
 * Search past conversations for keywords (e.g., "water bottle", "cake").
 * Used for reorder detection.
 */
export async function searchChatHistory(
    userId: string,
    query: string,
    limit: number = 20
): Promise<ChatRecord[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", userId)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error searching chat history:", error);
        return [];
    }

    return (data || []) as ChatRecord[];
}

/**
 * Update user tone/communication style in their profile.
 * Called after each interaction to progressively learn the user's vibe.
 */
export async function updateUserTone(
    userId: string,
    detectedTone: string
): Promise<void> {
    if (!useCloud || !supabase) return;

    // Get current profile
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("detected_tone, tone_confidence, interaction_count")
        .eq("id", userId)
        .single();

    if (!profile) return;

    const interactionCount = (profile.interaction_count || 0) + 1;
    
    // Progressive learning: tone_confidence increases with consistent signals
    // If the new tone matches the stored tone, increase confidence
    // If it differs, reduce confidence and eventually switch
    let newTone = profile.detected_tone || "neutral";
    let newConfidence = profile.tone_confidence || 0;

    if (detectedTone === newTone) {
        // Same tone — reinforce (cap at 1.0)
        newConfidence = Math.min(1.0, newConfidence + 0.15);
    } else if (newConfidence <= 0.2) {
        // Confidence is low enough to switch
        newTone = detectedTone;
        newConfidence = 0.2;
    } else {
        // Different tone — erode confidence
        newConfidence = Math.max(0, newConfidence - 0.1);
    }

    await supabase
        .from("user_profiles")
        .update({
            detected_tone: newTone,
            tone_confidence: newConfidence,
            interaction_count: interactionCount,
            updated_at: new Date().toISOString()
        })
        .eq("id", userId);
}

/**
 * Get user's detected communication tone.
 */
export async function getUserTone(userId: string): Promise<{ tone: string; confidence: number }> {
    if (!useCloud || !supabase) return { tone: "neutral", confidence: 0 };

    const { data } = await supabase
        .from("user_profiles")
        .select("detected_tone, tone_confidence")
        .eq("id", userId)
        .single();

    return {
        tone: data?.detected_tone || "neutral",
        confidence: data?.tone_confidence || 0
    };
}
