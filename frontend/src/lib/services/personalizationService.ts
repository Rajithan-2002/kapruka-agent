import { getProfile } from "./profileService";
import { getRelationships, getPreferences, getMemories, RankedMemory, RankedPreference } from "./memoryService";

/**
 * PHASE 1 - MEMORY RETRIEVAL
 * Builds a structured user context block to inject into the AI prompt.
 */
export async function buildUserContext(): Promise<string> {
    // 1. Load data
    const profile = await getProfile();
    const relationships = await getRelationships();
    const preferences = await getPreferences();
    const memories = await getMemories();

    // 2. Format Profile
    const profileBlock = `Known User Profile:
- Preferred language: ${profile.primary_language}
- Communication style: ${profile.communication_style}
- Average budget: ${profile.average_budget}`;

    // 3. Format Memories
    // We only take the top 5 most important/recent memories to avoid bloating context
    const topMemories = memories.slice(0, 5);
    const memoriesBlock = topMemories.length > 0 
        ? `Known Memories:\n${topMemories.map(m => `- ${m.value}`).join("\n")}`
        : `Known Memories: None yet.`;

    // 4. Format Relationships and their nested Preferences
    const relsWithPrefs = relationships.map(rel => {
        const relPrefs = preferences.filter(p => p.relationship_id === rel.id);
        let lines = [`- ${rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1)} (${rel.nickname})`];
        
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
    
    // Add orphaned preferences (for the user themselves)
    const userPrefs = preferences.filter(p => !p.relationship_id);
    if (userPrefs.length > 0) {
        relsWithPrefs.push(`- User\n${userPrefs.map(p => `  - Prefers ${p.interest}`).join("\n")}`);
    }

    const relationshipsBlock = relsWithPrefs.length > 0 
        ? `Relationships:\n${relsWithPrefs.join("\n")}`
        : `Relationships: None yet.`;

    // 5. Combine everything into the final context block
    return `${profileBlock}\n\n${memoriesBlock}\n\n${relationshipsBlock}`;
}
