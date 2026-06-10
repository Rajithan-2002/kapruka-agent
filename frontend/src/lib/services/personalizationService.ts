import { getProfile } from "./profileService";
import { getRelationships, getPreferences, getMemories } from "./memoryService";
import { getBehaviorProfile } from "./behaviorProfileService";
import { getPurchaseHistory } from "./purchaseHistoryService";

/**
 * PHASE 1 - MEMORY RETRIEVAL (Enhanced with Recipient-specific Context Isolation)
 * Builds a structured user context block to inject into the AI prompt.
 */
export async function buildUserContext(userId: string, currentRecipient?: string | null): Promise<string> {
    // 1. Load data
    const profile = await getProfile(userId);
    const relationships = await getRelationships(userId);
    const preferences = await getPreferences(userId);
    const memories = await getMemories(userId);
    const behavior = await getBehaviorProfile(userId);
    const purchases = await getPurchaseHistory(userId, 5);

    // Normalize active recipient
    const activeRecip = currentRecipient ? currentRecipient.toLowerCase().trim() : null;

    // 2. Format Profile & Behavior
    const profileBlock = `Known User Profile & Personality Stage:
- Preferred language: ${profile.primary_language}
- Communication style: ${profile.communication_style}
- Average budget: ${profile.average_budget} LKR
- Personality stage: ${behavior.personality_stage} (Strength: ${behavior.relationship_strength.toFixed(2)})
- Favorite categories: ${behavior.favorite_categories.join(", ") || "None yet"}
- Standard budget range: Min: ${behavior.favorite_price_range.min} LKR, Max: ${behavior.favorite_price_range.max} LKR`;

    // 3. Format Recent Purchases
    const purchasesBlock = purchases.length > 0
        ? `Recent Product Interactions:\n${purchases.map(p => `- [${p.action.toUpperCase()}] ${p.product_name} (${p.product_category}) - ${p.product_price} LKR`).join("\n")}`
        : `Recent Product Interactions: None recorded yet.`;

    // 4. Format Memories (Filter for current recipient if active)
    let filteredMemories = memories;
    if (activeRecip) {
        // Keep memories that do not belong to other relationships
        filteredMemories = memories.filter(m => {
            const cat = m.category.toLowerCase();
            const val = m.value.toLowerCase();
            const key = m.key.toLowerCase();
            
            // If it explicitly belongs to another recipient, exclude it
            const otherRecipients = ["mother", "mom", "amma", "girlfriend", "wife", "father", "dad", "thaththa", "friend", "boss", "child"]
                .filter(r => r !== activeRecip);
                
            return !otherRecipients.some(r => val.includes(r) || key.includes(r));
        });
    }

    const topMemories = filteredMemories.slice(0, 5);
    const memoriesBlock = topMemories.length > 0 
        ? `Known Memories (Filtered for active recipient: ${currentRecipient || 'All'}):\n${topMemories.map(m => `- ${m.value}`).join("\n")}`
        : `Known Memories: None yet.`;

    // 5. Format Relationships and preferences
    const relsWithPrefs = relationships.map(rel => {
        const relType = rel.relationship_type.toLowerCase();
        const isActive = activeRecip && (relType === activeRecip || rel.nickname.toLowerCase() === activeRecip);
        
        // Skip or mark inactive relationships to prevent prompt confusion
        if (activeRecip && !isActive) {
            return `- ${rel.relationship_type} (${rel.nickname}) [STATUS: INACTIVE FOR THIS CHAT - DO NOT RECOMMEND FOR HER]`;
        }

        const relPrefs = preferences.filter(p => p.relationship_id === rel.id);
        let lines = [`- ${rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1)} (${rel.nickname}) [ACTIVE TARGET]`];
        
        if (rel.birthday) {
            lines.push(`  - Birthday: ${rel.birthday}`);
        }
        if (rel.notes) {
            lines.push(`  - Notes: ${rel.notes}`);
        }
        
        relPrefs.forEach(pref => {
            lines.push(`  - Likes ${pref.interest}`);
        });
        
        return lines.join("\n");
    });
    
    // Add orphaned preferences (only if not searching for a specific other relationship)
    if (!activeRecip) {
        const userPrefs = preferences.filter(p => !p.relationship_id);
        if (userPrefs.length > 0) {
            relsWithPrefs.push(`- User\n${userPrefs.map(p => `  - Prefers ${p.interest}`).join("\n")}`);
        }
    }

    const relationshipsBlock = relsWithPrefs.length > 0 
        ? `Relationships & Preferences:\n${relsWithPrefs.join("\n")}`
        : `Relationships & Preferences: None yet.`;

    // 6. Combine everything into the final context block
    return `${profileBlock}\n\n${purchasesBlock}\n\n${memoriesBlock}\n\n${relationshipsBlock}`;
}
