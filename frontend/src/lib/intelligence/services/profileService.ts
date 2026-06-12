import { createClient } from "@supabase/supabase-js";
import { RelationshipProfile } from "../types/intelligence.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export class ProfileService {
  /**
   * Retrieves the full relationship profile including preferences and gift history.
   */
  public static async getRelationshipProfile(userId: string, recipientName: string): Promise<RelationshipProfile | null> {
    if (!userId || !recipientName || recipientName === "UNKNOWN" || !supabase) return null;

    try {
      // 1. Get the base profile
      const { data: profileData, error: profileError } = await supabase
        .from("relationship_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("recipient_name", recipientName)
        .single();

      if (profileError || !profileData) return null;

      // 2. Get preferences
      const { data: prefData } = await supabase
        .from("recipient_preferences")
        .select("preference_type, preference_value")
        .eq("profile_id", profileData.id);

      const interests = prefData?.filter(p => p.preference_type === "INTEREST").map(p => p.preference_value) || [];
      const dislikes = prefData?.filter(p => p.preference_type === "DISLIKE").map(p => p.preference_value) || [];

      // 3. Get gift history
      const { data: historyData } = await supabase
        .from("gift_history")
        .select("product_name, was_successful")
        .eq("profile_id", profileData.id);

      const successful_gifts = historyData?.filter(h => h.was_successful !== false).map(h => h.product_name) || [];
      const failed_gifts = historyData?.filter(h => h.was_successful === false).map(h => h.product_name) || [];

      return {
        id: profileData.id,
        recipient_name: profileData.recipient_name,
        relationship_type: profileData.relationship_type,
        relationship_strength: profileData.relationship_strength,
        interests,
        dislikes,
        successful_gifts,
        failed_gifts
      };
    } catch (err) {
      console.error("Error fetching relationship profile:", err);
      return null;
    }
  }

  public static async recordPreferenceSignal(profileId: string, type: "INTEREST" | "DISLIKE", value: string) {
    if (!supabase) return;
    await supabase.from("recipient_preferences").insert({
      profile_id: profileId,
      preference_type: type,
      preference_value: value,
      confidence_score: 0.8 // Infered from chat
    });
  }

  public static async recordGift(profileId: string, productId: string, productName: string, occasion: string) {
    if (!supabase) return;
    await supabase.from("gift_history").insert({
      profile_id: profileId,
      product_id: productId,
      product_name: productName,
      occasion
    });
  }
}
