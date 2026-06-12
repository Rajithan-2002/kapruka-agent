import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
if (!supabaseKey) {
  console.warn("[LearningEngine] Warning: SUPABASE_SERVICE_KEY is not set in environment. Database-backed learning features will be disabled.");
}
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export class LearningEngine {
  /**
   * Records a positive or negative learning signal when a user interacts with a recommendation.
   */
  public static async recordFeedback(userId: string, eventType: "POSITIVE_SIGNAL" | "NEGATIVE_SIGNAL", context: any) {
    if (!userId || !supabase) return;
    try {
      await supabase.from("learning_events").insert({
        user_id: userId,
        event_type: eventType,
        context: context
      });
    } catch (err) {
      console.error("Failed to record learning event:", err);
    }
  }

  /**
   * Updates relationship strength dynamically based on successful gift purchases.
   */
  public static async updateRelationshipStrength(profileId: string, increment: boolean) {
    if (!profileId || !supabase) return;
    try {
      // Fetch current strength
      const { data } = await supabase.from("relationship_profiles").select("relationship_strength").eq("id", profileId).single();
      if (!data) return;

      let newStrength = data.relationship_strength;
      if (increment && newStrength < 10) newStrength += 1;
      if (!increment && newStrength > 1) newStrength -= 1;

      if (newStrength !== data.relationship_strength) {
        await supabase.from("relationship_profiles").update({ relationship_strength: newStrength }).eq("id", profileId);
      }
    } catch (err) {
      console.error("Failed to update relationship strength:", err);
    }
  }
}
