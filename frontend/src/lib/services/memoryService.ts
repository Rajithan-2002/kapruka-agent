import { createClient } from "@supabase/supabase-js";
import { Relationship, Preference, ConversationMemory } from "../db";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;
const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000";

// Extended interfaces to include importance scoring
export interface RankedPreference extends Preference {
    importance_score?: number;
    last_used_at?: string;
}

export interface RankedMemory extends ConversationMemory {
    importance_score?: number;
    last_used_at?: string;
}

export async function getRelationships(): Promise<Relationship[]> {
    if (!useCloud || !supabase) return [];
    
    const { data, error } = await supabase
        .from("relationships")
        .select("*")
        .eq("user_id", FALLBACK_USER_ID);
        
    if (error) {
        console.error("Error getting relationships:", error);
        return [];
    }
    
    return data.map(r => ({
        id: r.id,
        relationship_type: r.relationship_type,
        nickname: r.nickname,
        birthday: r.birthday || undefined,
        notes: r.notes || undefined
    }));
}

export async function getPreferences(): Promise<RankedPreference[]> {
    if (!useCloud || !supabase) return [];
    
    // Attempt to order by importance_score if column exists, else standard select
    const { data, error } = await supabase
        .from("preferences")
        .select("*")
        .eq("user_id", FALLBACK_USER_ID)
        .order("importance_score", { ascending: false, nullsFirst: false })
        .order("confidence_score", { ascending: false });
        
    if (error) {
        // Fallback in case importance_score column doesn't exist yet
        const fb = await supabase
            .from("preferences")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID)
            .order("confidence_score", { ascending: false });
            
        if (fb.error) return [];
        return fb.data as RankedPreference[];
    }
    
    return data as RankedPreference[];
}

export async function getMemories(): Promise<RankedMemory[]> {
    if (!useCloud || !supabase) return [];
    
    const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", FALLBACK_USER_ID)
        .order("importance_score", { ascending: false, nullsFirst: false })
        .order("timestamp", { ascending: false });
        
    if (error) {
        // Fallback in case importance_score column doesn't exist yet
        const fb = await supabase
            .from("memories")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID)
            .order("timestamp", { ascending: false });
            
        if (fb.error) return [];
        return fb.data as RankedMemory[];
    }
    
    return data as RankedMemory[];
}
