import { createClient } from "@supabase/supabase-js";
import { UserProfile } from "../db"; // Using existing interfaces from db.ts for now

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;
const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000";

const DEFAULT_PROFILE: UserProfile = {
    primary_language: "singlish",
    communication_style: "casual",
    average_budget: 6000
};

export async function getProfile(): Promise<UserProfile> {
    if (useCloud && supabase) {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", FALLBACK_USER_ID)
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
