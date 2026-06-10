import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export interface BehaviorProfile {
    user_id: string;
    favorite_categories: string[];
    favorite_price_range: { min: number; max: number; avg: number };
    total_purchases: number;
    total_interactions: number;
    last_purchase_date?: string;
    relationship_strength: number;
    personality_stage: 'new_acquaintance' | 'familiar' | 'trusted_friend' | 'best_friend';
    updated_at?: string;
}

const DEFAULT_PROFILE: BehaviorProfile = {
    user_id: "",
    favorite_categories: [],
    favorite_price_range: { min: 0, max: 0, avg: 0 },
    total_purchases: 0,
    total_interactions: 0,
    relationship_strength: 0.0,
    personality_stage: 'new_acquaintance'
};

/**
 * Gets or initializes the behavior profile for a user.
 */
export async function getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    if (!useCloud || !supabase) {
        return { ...DEFAULT_PROFILE, user_id: userId };
    }

    const { data, error } = await supabase
        .from("behavior_profile")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching behavior profile:", error);
        return { ...DEFAULT_PROFILE, user_id: userId };
    }

    if (!data) {
        // Initialize profile
        const newProfile: BehaviorProfile = {
            user_id: userId,
            favorite_categories: [],
            favorite_price_range: { min: 0, max: 0, avg: 0 },
            total_purchases: 0,
            total_interactions: 0,
            relationship_strength: 0.0,
            personality_stage: 'new_acquaintance'
        };

        const { error: insertError } = await supabase
            .from("behavior_profile")
            .insert(newProfile);

        if (insertError) {
            console.error("Error initializing behavior profile:", insertError);
        }

        return newProfile;
    }

    return data as BehaviorProfile;
}

/**
 * Updates the user's behavior profile after a purchase or interaction.
 */
export async function updateAfterPurchase(
    userId: string,
    purchaseData: { category: string; price: number }
): Promise<BehaviorProfile> {
    const profile = await getBehaviorProfile(userId);

    // 1. Increment total purchases
    const totalPurchases = profile.total_purchases + 1;

    // 2. Favorite Categories
    const categories = new Set(profile.favorite_categories || []);
    categories.add(purchaseData.category);

    // 3. Recalculate price ranges
    const minPrice = profile.favorite_price_range.min === 0 
        ? purchaseData.price 
        : Math.min(profile.favorite_price_range.min, purchaseData.price);
    const maxPrice = Math.max(profile.favorite_price_range.max, purchaseData.price);
    const avgPrice = profile.favorite_price_range.avg === 0 
        ? purchaseData.price 
        : Math.round((profile.favorite_price_range.avg * profile.total_purchases + purchaseData.price) / totalPurchases);

    // 4. Personality / relationship updates
    const updated = await updateRelationshipAndPersonality(userId, totalPurchases, profile.total_interactions);

    const updatedProfile: Partial<BehaviorProfile> = {
        favorite_categories: Array.from(categories),
        favorite_price_range: { min: minPrice, max: maxPrice, avg: avgPrice },
        total_purchases: totalPurchases,
        last_purchase_date: new Date().toISOString(),
        relationship_strength: updated.relationship_strength,
        personality_stage: updated.personality_stage,
        updated_at: new Date().toISOString()
    };

    if (useCloud && supabase) {
        await supabase
            .from("behavior_profile")
            .update(updatedProfile)
            .eq("user_id", userId);
    }

    return { ...profile, ...updatedProfile };
}

/**
 * Increments interaction counts and updates personality evolution stages.
 */
export async function recordInteraction(userId: string): Promise<BehaviorProfile> {
    const profile = await getBehaviorProfile(userId);
    const totalInteractions = profile.total_interactions + 1;

    const updated = await updateRelationshipAndPersonality(userId, profile.total_purchases, totalInteractions);

    const updatedProfile: Partial<BehaviorProfile> = {
        total_interactions: totalInteractions,
        relationship_strength: updated.relationship_strength,
        personality_stage: updated.personality_stage,
        updated_at: new Date().toISOString()
    };

    if (useCloud && supabase) {
        await supabase
            .from("behavior_profile")
            .update(updatedProfile)
            .eq("user_id", userId);
    }

    return { ...profile, ...updatedProfile };
}

/**
 * Calculates relationship strength (0.0 to 1.0) and personality stage.
 */
async function updateRelationshipAndPersonality(
    userId: string,
    purchases: number,
    interactions: number
): Promise<{ relationship_strength: number; personality_stage: BehaviorProfile['personality_stage'] }> {
    // Basic weight: 1 purchase = 10 interactions
    const score = (purchases * 10) + interactions;

    let strength = Math.min(1.0, score / 100);
    let stage: BehaviorProfile['personality_stage'] = 'new_acquaintance';

    if (score >= 80) {
        stage = 'best_friend';
    } else if (score >= 40) {
        stage = 'trusted_friend';
    } else if (score >= 15) {
        stage = 'familiar';
    }

    return {
        relationship_strength: strength,
        personality_stage: stage
    };
}
