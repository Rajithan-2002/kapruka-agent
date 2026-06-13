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

export const GUEST_USER_ID = "22222222-2222-2222-2222-222222222222";

export async function getOrCreateJourney(
    userId: string,
    sessionId: string,
    occasion?: string,
    recipient?: string
): Promise<ShoppingJourney> {
    const activeUserId = !userId || userId === "00000000-0000-0000-0000-000000000000" ? GUEST_USER_ID : userId;

    if (!useCloud || !supabase) {
        return {
            id: `journey-${sessionId}`,
            user_id: activeUserId,
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
        .eq("user_id", activeUserId)
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
        user_id: activeUserId,
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
    const activeUserId = !userId || userId === "00000000-0000-0000-0000-000000000000" ? GUEST_USER_ID : userId;

    if (!useCloud || !supabase) return;

    await supabase
        .from("shopping_journey")
        .update({
            stages,
            updated_at: new Date().toISOString()
        })
        .eq("user_id", activeUserId)
        .eq("session_id", sessionId);
}

export async function getJourneySnapshot(sessionId: string): Promise<string | null> {
    if (!useCloud || !supabase) return null;
    
    const { data, error } = await supabase
        .from('shopping_journey')
        .select('journey_state')
        .eq('session_id', sessionId)
        .maybeSingle();
        
    if (error || !data || !data.journey_state) return null;
    return (data.journey_state as any).journeyState || null;
}

export async function saveJourneySnapshot(sessionId: string, state: string): Promise<void> {
    if (!useCloud || !supabase) return;

    let activeUserId = GUEST_USER_ID;
    try {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (user) activeUserId = user.id;
    } catch (_) {}

    const { data } = await supabase
        .from('shopping_journey')
        .select('journey_state')
        .eq('session_id', sessionId)
        .maybeSingle();

    const existingSnapshot = data?.journey_state || {
        sessionId,
        journeyState: "IDLE",
        activeBundle: [],
        recommendedProducts: [],
        lastUpdated: new Date().toISOString()
    };

    const updatedSnapshot = {
        ...existingSnapshot,
        journeyState: state,
        lastUpdated: new Date().toISOString()
    };

    const { error } = await supabase
        .from('shopping_journey')
        .upsert({
            id: `jou-${sessionId}`,
            session_id:     sessionId,
            user_id:        activeUserId,
            journey_state:  updatedSnapshot,
            updated_at:     new Date().toISOString()
        }, { onConflict: 'session_id' });
        
    if (error) {
        console.error('[JourneyService] Save failed:', error.message);
        throw error;
    }
}
