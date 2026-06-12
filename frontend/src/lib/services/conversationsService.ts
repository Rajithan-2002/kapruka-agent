import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface Conversation {
    id: string;
    user_id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Creates a new conversation session record.
 */
export async function createConversation(
    userId: string,
    conversationId: string,
    title: string = "New Chat"
): Promise<Conversation> {
    if (!useCloud || !supabase) {
        return { id: conversationId, user_id: userId, title };
    }

    const { data, error } = await supabase
        .from("conversations")
        .upsert({
            id: conversationId,
            user_id: userId,
            title
        }, { onConflict: "id" })
        .select()
        .single();

    if (error) {
        console.error("Error creating conversation in DB:", error);
        return { id: conversationId, user_id: userId, title };
    }

    return data as Conversation;
}

/**
 * Gets all conversation sessions for a user.
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
    if (!useCloud || !supabase) return [];

    const { data, error } = await supabase
        .from("conversations")
        .select(`
            *,
            chat_history:chat_history(count)
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }

    // Filter out empty conversations with 0 messages
    const filtered = (data || []).filter((c: any) => {
        const count = c.chat_history?.[0]?.count || 0;
        return count > 0;
    });

    return filtered.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        title: c.title,
        created_at: c.created_at,
        updated_at: c.updated_at
    }));
}

/**
 * Updates a conversation title.
 */
export async function updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string
): Promise<void> {
    if (!useCloud || !supabase) return;

    const { error } = await supabase
        .from("conversations")
        .update({
            title,
            updated_at: new Date().toISOString()
        })
        .eq("id", conversationId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error updating conversation title:", error);
    }
}

/**
 * Deletes a conversation session and all its linked messages (cascade delete).
 */
export async function deleteConversation(
    userId: string,
    conversationId: string
): Promise<void> {
    if (!useCloud || !supabase) return;

    const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting conversation:", error);
    }
}

/**
 * Uses LLM to automatically summarize a conversation topic into a punchy title
 * based on the first few user prompts.
 */
export async function generateConversationTitle(
    userId: string,
    conversationId: string,
    firstUserMessage: string
): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Generate a short, punchy 3-5 word title summarizing the user's shopping request. Avoid quotes, generic greetings, or words like 'Search' or 'Kapruka'. Return only the raw title string, e.g. 'Birthday Gift for Girlfriend', 'Chocolate Cake Order', 'Flower Delivery'."
                },
                {
                    role: "user",
                    content: firstUserMessage
                }
            ]
        });

        const title = response.choices[0].message.content?.trim() || "Shopping Chat";
        await updateConversationTitle(userId, conversationId, title);
        return title;
    } catch (error) {
        console.error("Error generating conversation title:", error);
        return "New Chat";
    }
}
