import { createClient } from "@supabase/supabase-js";
import { Relationship, Preference, ConversationMemory } from "../db";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

// Extended interfaces to include importance scoring
export interface RankedPreference extends Preference {
    importance_score?: number;
    last_used_at?: string;
    source?: "user" | "system" | "purchase" | "llm";
    memoryOrigin?: "USER_EXPLICIT" | "USER_IMPLICIT" | "LLM_INFERRED" | "PURCHASE_BEHAVIOR" | "SYSTEM_GENERATED";
    verificationStatus?: "VERIFIED" | "INFERRED" | "STALE" | "VERIFY_BEFORE_USE";
    lastConfirmedAt?: string | null;
}

export interface RankedMemory extends ConversationMemory {
    importance_score?: number;
    last_used_at?: string;
    source?: "user" | "system" | "purchase" | "llm";
    memoryOrigin?: "USER_EXPLICIT" | "USER_IMPLICIT" | "LLM_INFERRED" | "PURCHASE_BEHAVIOR" | "SYSTEM_GENERATED";
    verificationStatus?: "VERIFIED" | "INFERRED" | "STALE" | "VERIFY_BEFORE_USE";
    lastConfirmedAt?: string | null;
}

export async function getRelationships(userId: string): Promise<Relationship[]> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return [];
    
    const { data, error } = await supabase
        .from("relationships")
        .select("*")
        .eq("user_id", userId);
        
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

function mapMemoryRow(row: Record<string, any>): RankedMemory {
    return {
        id: row.id,
        category: row.category,
        key: row.key,
        value: row.value,
        timestamp: row.timestamp || row.created_at,
        importance_score: row.importance_score,
        last_used_at: row.last_used_at,
        source: row.source,
        memoryOrigin: row.memory_origin,
        verificationStatus: row.verification_status,
        lastConfirmedAt: row.last_confirmed_at
    };
}

function mapPreferenceRow(row: Record<string, any>): RankedPreference {
    return {
        id: row.id,
        relationship_id: row.relationship_id,
        interest: row.interest,
        confidence_score: row.confidence_score,
        importance_score: row.importance_score,
        last_used_at: row.last_used_at,
        source: row.source,
        memoryOrigin: row.memory_origin,
        verificationStatus: row.verification_status,
        lastConfirmedAt: row.last_confirmed_at
    };
}

export async function getPreferences(userId: string): Promise<RankedPreference[]> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return [];
    
    const { data, error } = await supabase
        .from("preferences")
        .select("*")
        .eq("user_id", userId)
        .order("importance_score", { ascending: false, nullsFirst: false })
        .order("confidence_score", { ascending: false });
        
    if (error) {
        const fb = await supabase
            .from("preferences")
            .select("*")
            .eq("user_id", userId)
            .order("confidence_score", { ascending: false });
            
        if (fb.error) return [];
        return (fb.data || []).map(mapPreferenceRow);
    }
    
    return (data || []).map(mapPreferenceRow);
}

export async function getMemories(userId: string): Promise<RankedMemory[]> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return [];
    
    const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("importance_score", { ascending: false, nullsFirst: false })
        .order("timestamp", { ascending: false });
        
    if (error) {
        const fb = await supabase
            .from("memories")
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false });
            
        if (fb.error) return [];
        return (fb.data || []).map(mapMemoryRow);
    }
    
    return (data || []).map(mapMemoryRow);
}

// Write Operations migrated from monolithic db.ts
export async function addRelationship(userId: string, data: Omit<Relationship, "id">): Promise<Relationship> {
    if (!useCloud || !supabase) throw new Error("No database connected");

    const id = `rel-${Date.now()}`;
    if (userId === "00000000-0000-0000-0000-000000000000") return { ...data, id };

    const insertData = {
        id,
        user_id: userId,
        relationship_type: data.relationship_type,
        nickname: data.nickname,
        birthday: data.birthday,
        notes: data.notes
    };

    const { error } = await supabase.from("relationships").insert(insertData);
    if (error) {
        console.error("Error adding relationship:", error);
        throw error;
    }

    return { ...data, id };
}

export async function addPreference(userId: string, relationshipId: string | undefined, interest: string): Promise<Preference> {
    if (!useCloud || !supabase) throw new Error("No database connected");

    if (userId === "00000000-0000-0000-0000-000000000000") {
        return { id: `pref-${Date.now()}`, relationship_id: relationshipId, interest, confidence_score: 1.0 };
    }

    // Phase 3 Check: If preference already exists, just bump importance score
    const existing = await getPreferences(userId);
    const match = existing.find(p => p.relationship_id === relationshipId && p.interest.toLowerCase() === interest.toLowerCase());
    
    if (match) {
        await incrementPreferenceImportance(userId, match.id);
        return match;
    }

    const id = `pref-${Date.now()}`;
    const insertData = {
        id,
        user_id: userId,
        relationship_id: relationshipId,
        interest,
        confidence_score: 1.0,
        importance_score: 1,
        source: "llm",
        memory_origin: "LLM_INFERRED",
        verification_status: "INFERRED"
    };

    const { error } = await supabase.from("preferences").insert(insertData);
    if (error) {
        console.error("Error adding preference:", error);
        throw error;
    }

    return { id, relationship_id: relationshipId, interest, confidence_score: 1.0 };
}

export async function addMemory(userId: string, category: string, key: string, value: string): Promise<ConversationMemory> {
    if (!useCloud || !supabase) throw new Error("No database connected");

    if (userId === "00000000-0000-0000-0000-000000000000") {
        return { id: `mem-${Date.now()}`, category, key, value, timestamp: new Date().toISOString() };
    }

    // Phase 3 Check: Avoid duplicates, bump score
    const existing = await getMemories(userId);
    const match = existing.find(m => m.category === category && m.key === key && m.value.toLowerCase() === value.toLowerCase());
    
    if (match) {
        await incrementMemoryImportance(userId, match.id);
        return match;
    }

    const id = `mem-${Date.now()}`;
    const insertData = {
        id,
        user_id: userId,
        category,
        key,
        value,
        importance_score: 1,
        source: "llm",
        memory_origin: "LLM_INFERRED",
        verification_status: "INFERRED"
    };

    const { error } = await supabase.from("memories").insert(insertData);
    if (error) {
        console.error("Error adding memory:", error);
        throw error;
    }

    return { id, category, key, value, timestamp: new Date().toISOString() };
}

// Phase 3 Scoring Updaters
export async function incrementPreferenceImportance(userId: string, prefId: string): Promise<void> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return;
    try {
        const { data } = await supabase.from("preferences").select("importance_score").eq("id", prefId).eq("user_id", userId).single();
        if (data) {
            await supabase.from("preferences")
                .update({ 
                    importance_score: (data.importance_score || 1) + 1,
                    last_used_at: new Date().toISOString()
                })
                .eq("id", prefId)
                .eq("user_id", userId);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function incrementMemoryImportance(userId: string, memId: string): Promise<void> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return;
    try {
        const { data } = await supabase.from("memories").select("importance_score").eq("id", memId).eq("user_id", userId).single();
        if (data) {
            await supabase.from("memories")
                .update({ 
                    importance_score: (data.importance_score || 1) + 1,
                    last_used_at: new Date().toISOString()
                })
                .eq("id", memId)
                .eq("user_id", userId);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function deleteRelationship(userId: string, relationshipId: string): Promise<void> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return;
    try {
        // Cascade delete associated preferences first
        await supabase.from("preferences").delete().eq("relationship_id", relationshipId).eq("user_id", userId);
        // Delete relationship
        const { error } = await supabase.from("relationships").delete().eq("id", relationshipId).eq("user_id", userId);
        if (error) throw error;
    } catch (e) {
        console.error("Error deleting relationship:", e);
        throw e;
    }
}

export async function updateRelationship(userId: string, relationshipId: string, updates: Partial<Omit<Relationship, "id">>): Promise<Relationship> {
    if (!useCloud || !supabase) throw new Error("No database connected");
    if (userId === "00000000-0000-0000-0000-000000000000") return { id: relationshipId, relationship_type: updates.relationship_type || "", nickname: updates.nickname || "" } as Relationship;
    try {
        const updatePayload: Record<string, any> = {};
        if (updates.relationship_type !== undefined) updatePayload.relationship_type = updates.relationship_type;
        if (updates.nickname !== undefined) updatePayload.nickname = updates.nickname;
        if (updates.birthday !== undefined) updatePayload.birthday = updates.birthday;
        if (updates.notes !== undefined) updatePayload.notes = updates.notes;

        const { data, error } = await supabase
            .from("relationships")
            .update(updatePayload)
            .eq("id", relationshipId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            relationship_type: data.relationship_type,
            nickname: data.nickname,
            birthday: data.birthday || undefined,
            notes: data.notes || undefined
        };
    } catch (e) {
        console.error("Error updating relationship:", e);
        throw e;
    }
}

export async function deletePreference(userId: string, preferenceId: string): Promise<void> {
    if (!useCloud || !supabase || userId === "00000000-0000-0000-0000-000000000000") return;
    try {
        const { error } = await supabase.from("preferences").delete().eq("id", preferenceId).eq("user_id", userId);
        if (error) throw error;
    } catch (e) {
        console.error("Error deleting preference:", e);
        throw e;
    }
}

