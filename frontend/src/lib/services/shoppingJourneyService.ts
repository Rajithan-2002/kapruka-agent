import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export interface JourneyStage {
    stage: string;
    status: 'pending' | 'completed';
}

export interface ShoppingJourney {
    id: string;
    user_id: string;
    session_id: string;
    occasion?: string;
    recipient?: string;
    stages: JourneyStage[];
    created_at?: string;
    updated_at?: string;
}

export async function getOrCreateJourney(
    userId: string,
    sessionId: string,
    occasion?: string,
    recipient?: string
): Promise<ShoppingJourney> {
    if (!useCloud || !supabase) {
        return {
            id: `journey-${sessionId}`,
            user_id: userId,
            session_id: sessionId,
            occasion,
            recipient,
            stages: []
        };
    }

    // Check if journey exists
    const { data, error } = await supabase
        .from("shopping_journey")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching shopping journey:", error);
    }

    if (data) {
        // Update occasion/recipient if provided and not set
        if ((occasion && !data.occasion) || (recipient && !data.recipient)) {
            const { data: updated, error: updateError } = await supabase
                .from("shopping_journey")
                .update({
                    occasion: occasion || data.occasion,
                    recipient: recipient || data.recipient,
                    updated_at: new Date().toISOString()
                })
                .eq("id", data.id)
                .select()
                .single();
            
            if (!updateError && updated) {
                return updated as ShoppingJourney;
            }
        }
        return data as ShoppingJourney;
    }

    // Create a new one
    const id = `jou-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newJourney: ShoppingJourney = {
        id,
        user_id: userId,
        session_id: sessionId,
        occasion: occasion || null as any,
        recipient: recipient || null as any,
        stages: []
    };

    const { error: insertError } = await supabase
        .from("shopping_journey")
        .insert(newJourney);

    if (insertError) {
        console.error("Error creating shopping journey:", insertError);
    }

    return newJourney;
}

export async function updateJourneyStages(
    userId: string,
    sessionId: string,
    stages: JourneyStage[]
): Promise<void> {
    if (!useCloud || !supabase) return;

    await supabase
        .from("shopping_journey")
        .update({
            stages,
            updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("session_id", sessionId);
}
