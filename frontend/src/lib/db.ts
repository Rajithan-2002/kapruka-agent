import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Define Interfaces for Memory Database Schema
export interface UserProfile {
    primary_language: string;
    communication_style: string;
    average_budget: number;
}

export interface Relationship {
    id: string;
    relationship_type: string; // mother, wife, girlfriend, father, friend, etc.
    nickname: string;
    birthday?: string;
    notes?: string;
}

export interface Preference {
    id: string;
    relationship_id?: string; // Links to a specific relationship, or empty if for the main user
    interest: string; // e.g., "gardening", "baking", "coffee"
    confidence_score: number;
}

export interface ConversationMemory {
    id: string;
    category: string; // "preference", "relationship", "commerce", "context"
    key: string;
    value: string;
    timestamp: string;
}

export interface StoredOrder {
    id: string;
    orderNumber: string;
    recipientName: string;
    totalAmount: number;
    items: string[];
    createdAt: string;
}

export interface DatabaseSchema {
    profile: UserProfile;
    relationships: Relationship[];
    preferences: Preference[];
    memories: ConversationMemory[];
    orders: StoredOrder[];
}

const DEFAULT_DB: DatabaseSchema = {
    profile: {
        primary_language: "singlish",
        communication_style: "casual",
        average_budget: 6000
    },
    relationships: [],
    preferences: [],
    memories: [],
    orders: []
};

// DB File Path inside the frontend/data directory
const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Supabase client initialization — uses service_role key (server-side only, never exposed to browser)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const useCloud = !!(supabaseUrl && supabaseServiceKey);
export const supabase = useCloud ? createClient(supabaseUrl!, supabaseServiceKey!) : null;
export const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000";

if (useCloud) {
    console.log("Kappy Cloud Database initialized using Supabase.");
} else {
    console.warn("Kappy: Supabase credentials missing. Falling back to local file-based database.");
}

async function ensureDir(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Ensure fallback user profile exists in Supabase
async function ensureUserProfileExists() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("id", FALLBACK_USER_ID)
            .maybeSingle();

        if (error) {
            console.error("Error checking user profile in Supabase:", error);
            return;
        }

        if (!data) {
            const { error: insertError } = await supabase
                .from("user_profiles")
                .insert({
                    id: FALLBACK_USER_ID,
                    primary_language: "singlish",
                    communication_style: "casual",
                    average_budget: 6000
                });
            if (insertError) {
                console.error("Error creating default user profile in Supabase:", insertError);
            } else {
                console.log("Default user profile created in Supabase.");
            }
        }
    } catch (err) {
        console.error("Unexpected error ensuring user profile:", err);
    }
}

export async function readDB(): Promise<DatabaseSchema> {
    if (useCloud && supabase) {
        try {
            await ensureUserProfileExists();

            const [profileRes, relationshipsRes, preferencesRes, memoriesRes, ordersRes] = await Promise.all([
                supabase.from("user_profiles").select("*").eq("id", FALLBACK_USER_ID).maybeSingle(),
                supabase.from("relationships").select("*").eq("user_id", FALLBACK_USER_ID),
                supabase.from("preferences").select("*").eq("user_id", FALLBACK_USER_ID),
                supabase.from("memories").select("*").eq("user_id", FALLBACK_USER_ID),
                supabase.from("orders").select("*").eq("user_id", FALLBACK_USER_ID)
            ]);

            if (profileRes.error) console.error("Supabase profile error:", profileRes.error);
            if (relationshipsRes.error) console.error("Supabase relationships error:", relationshipsRes.error);
            if (preferencesRes.error) console.error("Supabase preferences error:", preferencesRes.error);
            if (memoriesRes.error) console.error("Supabase memories error:", memoriesRes.error);
            if (ordersRes.error) console.error("Supabase orders error:", ordersRes.error);

            const profile: UserProfile = profileRes.data ? {
                primary_language: profileRes.data.primary_language,
                communication_style: profileRes.data.communication_style,
                average_budget: profileRes.data.average_budget
            } : DEFAULT_DB.profile;

            const relationships: Relationship[] = (relationshipsRes.data || []).map(r => ({
                id: r.id,
                relationship_type: r.relationship_type,
                nickname: r.nickname,
                birthday: r.birthday || undefined,
                notes: r.notes || undefined
            }));

            const preferences: Preference[] = (preferencesRes.data || []).map(p => ({
                id: p.id,
                relationship_id: p.relationship_id || undefined,
                interest: p.interest,
                confidence_score: p.confidence_score
            }));

            const memories: ConversationMemory[] = (memoriesRes.data || []).map(m => ({
                id: m.id,
                category: m.category,
                key: m.key,
                value: m.value,
                timestamp: m.timestamp
            }));

            const orders: StoredOrder[] = (ordersRes.data || []).map(o => ({
                id: o.id,
                orderNumber: o.order_number,
                recipientName: o.recipient_name,
                totalAmount: o.total_amount,
                items: o.items || [],
                createdAt: o.created_at
            }));

            return {
                profile,
                relationships,
                preferences,
                memories,
                orders
            };
        } catch (error) {
            console.error("Failed to read from Supabase. Falling back to default DB.", error);
            return DEFAULT_DB;
        }
    }

    try {
        await ensureDir(path.dirname(DB_FILE));
        const fileContent = await fs.readFile(DB_FILE, "utf-8");
        return JSON.parse(fileContent);
    } catch {
        // If file doesn't exist, create it with default schema
        await writeDB(DEFAULT_DB);
        return DEFAULT_DB;
    }
}

export async function writeDB(data: DatabaseSchema): Promise<void> {
    if (useCloud && supabase) {
        // In cloud mode, changes are saved via direct table operations, so writeDB is a no-op
        return;
    }
    await ensureDir(path.dirname(DB_FILE));
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// PROFILE LOGIC
export async function getProfile(): Promise<UserProfile> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", FALLBACK_USER_ID)
            .maybeSingle();
        if (error) {
            console.error("Error getting profile from Supabase:", error);
            return DEFAULT_DB.profile;
        }
        if (!data) {
            await ensureUserProfileExists();
            return DEFAULT_DB.profile;
        }
        return {
            primary_language: data.primary_language,
            communication_style: data.communication_style,
            average_budget: data.average_budget
        };
    }
    const db = await readDB();
    return db.profile;
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    if (useCloud && supabase) {
        await ensureUserProfileExists();
        const updatePayload: Record<string, string | number> = {};
        if (profile.primary_language !== undefined) updatePayload.primary_language = profile.primary_language;
        if (profile.communication_style !== undefined) updatePayload.communication_style = profile.communication_style;
        if (profile.average_budget !== undefined) updatePayload.average_budget = profile.average_budget;

        const { data, error } = await supabase
            .from("user_profiles")
            .update(updatePayload)
            .eq("id", FALLBACK_USER_ID)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Error updating profile in Supabase:", error);
            throw error;
        }
        if (!data) {
            throw new Error("Profile not found in Supabase during update");
        }
        return {
            primary_language: data.primary_language,
            communication_style: data.communication_style,
            average_budget: data.average_budget
        };
    }
    const db = await readDB();
    db.profile = { ...db.profile, ...profile };
    await writeDB(db);
    return db.profile;
}

// RELATIONSHIPS LOGIC
export async function getRelationships(): Promise<Relationship[]> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("relationships")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID);
        if (error) {
            console.error("Error getting relationships from Supabase:", error);
            return [];
        }
        return (data || []).map(r => ({
            id: r.id,
            relationship_type: r.relationship_type,
            nickname: r.nickname,
            birthday: r.birthday || undefined,
            notes: r.notes || undefined
        }));
    }
    const db = await readDB();
    return db.relationships;
}

export async function addRelationship(rel: Omit<Relationship, "id">): Promise<Relationship> {
    const id = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    if (useCloud && supabase) {
        const { error } = await supabase
            .from("relationships")
            .insert({
                id,
                user_id: FALLBACK_USER_ID,
                relationship_type: rel.relationship_type,
                nickname: rel.nickname,
                birthday: rel.birthday || null,
                notes: rel.notes || null
            });
        if (error) {
            console.error("Error adding relationship to Supabase:", error);
            throw error;
        }
        return {
            ...rel,
            id
        };
    }
    const db = await readDB();
    const newRel = {
        ...rel,
        id
    };
    db.relationships.push(newRel);
    await writeDB(db);
    return newRel;
}

// PREFERENCES LOGIC
export async function getPreferences(relationshipId?: string): Promise<Preference[]> {
    if (useCloud && supabase) {
        let query = supabase
            .from("preferences")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID);
        
        if (relationshipId) {
            query = query.eq("relationship_id", relationshipId);
        } else {
            query = query.is("relationship_id", null);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error getting preferences from Supabase:", error);
            return [];
        }
        return (data || []).map(p => ({
            id: p.id,
            relationship_id: p.relationship_id || undefined,
            interest: p.interest,
            confidence_score: p.confidence_score
        }));
    }
    const db = await readDB();
    return db.preferences.filter(pref => pref.relationship_id === relationshipId);
}

export async function addPreference(relationshipId: string | undefined, interest: string, confidence = 1.0): Promise<Preference> {
    if (useCloud && supabase) {
        let query = supabase
            .from("preferences")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID)
            .ilike("interest", interest.trim());
        
        if (relationshipId) {
            query = query.eq("relationship_id", relationshipId);
        } else {
            query = query.is("relationship_id", null);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
            console.error("Error searching preference in Supabase:", error);
        }

        if (data) {
            const newConfidence = Math.min(1.0, data.confidence_score + 0.1);
            const { data: updatedData, error: updateError } = await supabase
                .from("preferences")
                .update({ confidence_score: newConfidence })
                .eq("id", data.id)
                .select()
                .single();
            if (updateError) {
                console.error("Error updating preference confidence in Supabase:", updateError);
                throw updateError;
            }
            return {
                id: updatedData.id,
                relationship_id: updatedData.relationship_id || undefined,
                interest: updatedData.interest,
                confidence_score: updatedData.confidence_score
            };
        } else {
            const id = `pref-${Date.now()}`;
            const { error: insertError } = await supabase
                .from("preferences")
                .insert({
                    id,
                    user_id: FALLBACK_USER_ID,
                    relationship_id: relationshipId || null,
                    interest: interest.trim(),
                    confidence_score: confidence
                });
            if (insertError) {
                console.error("Error inserting preference into Supabase:", insertError);
                throw insertError;
            }
            return {
                id,
                relationship_id: relationshipId,
                interest: interest.trim(),
                confidence_score: confidence
            };
        }
    }

    const db = await readDB();
    const existing = db.preferences.find(
        p => p.relationship_id === relationshipId && p.interest.toLowerCase() === interest.toLowerCase()
    );
    
    if (existing) {
        existing.confidence_score = Math.min(1.0, existing.confidence_score + 0.1);
        await writeDB(db);
        return existing;
    }

    const newPref: Preference = {
        id: `pref-${Date.now()}`,
        relationship_id: relationshipId,
        interest: interest.trim(),
        confidence_score: confidence
    };
    db.preferences.push(newPref);
    await writeDB(db);
    return newPref;
}

// MEMORIES LOGIC
export async function getMemories(): Promise<ConversationMemory[]> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("memories")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID);
        if (error) {
            console.error("Error getting memories from Supabase:", error);
            return [];
        }
        return (data || []).map(m => ({
            id: m.id,
            category: m.category,
            key: m.key,
            value: m.value,
            timestamp: m.timestamp
        }));
    }
    const db = await readDB();
    return db.memories;
}

export async function addMemory(category: string, key: string, value: string): Promise<ConversationMemory> {
    const id = `mem-${Date.now()}`;
    const timestamp = new Date().toISOString();
    if (useCloud && supabase) {
        const { error } = await supabase
            .from("memories")
            .insert({
                id,
                user_id: FALLBACK_USER_ID,
                category,
                key: key.trim(),
                value: value.trim(),
                timestamp
            });
        if (error) {
            console.error("Error adding memory to Supabase:", error);
            throw error;
        }
        return {
            id,
            category,
            key: key.trim(),
            value: value.trim(),
            timestamp
        };
    }
    const db = await readDB();
    const newMemory: ConversationMemory = {
        id,
        category,
        key: key.trim(),
        value: value.trim(),
        timestamp
    };
    db.memories.push(newMemory);
    await writeDB(db);
    return newMemory;
}

// ORDERS LOGIC
export async function getOrders(): Promise<StoredOrder[]> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", FALLBACK_USER_ID);
        if (error) {
            console.error("Error getting orders from Supabase:", error);
            return [];
        }
        return (data || []).map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            recipientName: o.recipient_name,
            totalAmount: o.total_amount,
            items: o.items || [],
            createdAt: o.created_at
        }));
    }
    const db = await readDB();
    return db.orders;
}

export async function addOrder(order: Omit<StoredOrder, "id" | "createdAt">): Promise<StoredOrder> {
    const id = `ord-${Date.now()}`;
    const createdAt = new Date().toISOString();
    if (useCloud && supabase) {
        const { error } = await supabase
            .from("orders")
            .insert({
                id,
                user_id: FALLBACK_USER_ID,
                order_number: order.orderNumber,
                recipient_name: order.recipientName,
                total_amount: order.totalAmount,
                items: order.items,
                created_at: createdAt
            });
        if (error) {
            console.error("Error adding order to Supabase:", error);
            throw error;
        }
        return {
            ...order,
            id,
            createdAt
        };
    }
    const db = await readDB();
    const newOrder: StoredOrder = {
        ...order,
        id,
        createdAt
    };
    db.orders.push(newOrder);
    await writeDB(db);
    return newOrder;
}
