import { createClient } from "@supabase/supabase-js";
import { UserProfile } from "../db"; // Using existing interfaces from db.ts for now

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_PROFILE: UserProfile = {
    primary_language: "singlish",
    communication_style: "casual",
    average_budget: 6000
};

export async function getProfile(userId: string): Promise<UserProfile> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.error("Error getting profile from Supabase:", error);
            return DEFAULT_PROFILE;
        }
        if (!data) {
            return DEFAULT_PROFILE;
        }
        return {
            primary_language: data.primary_language,
            communication_style: data.communication_style,
            average_budget: data.average_budget
        };
    }
    return DEFAULT_PROFILE;
}

export async function updateProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    if (!useCloud || !supabase) throw new Error("No database connected");

    const updatePayload: Record<string, string | number> = {};
    if (profile.primary_language !== undefined) updatePayload.primary_language = profile.primary_language;
    if (profile.communication_style !== undefined) updatePayload.communication_style = profile.communication_style;
    if (profile.average_budget !== undefined) updatePayload.average_budget = profile.average_budget;

    const { data, error } = await supabase
        .from("user_profiles")
        .update(updatePayload)
        .eq("id", userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating profile in Supabase:", error);
        throw error;
    }

    return {
        primary_language: data.primary_language,
        communication_style: data.communication_style,
        average_budget: data.average_budget
    };
}
