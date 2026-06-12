import { RankedMemory, RankedPreference } from "../../services/memoryService";

type MemoryItem = RankedMemory | RankedPreference;

export class MemoryPresentationLayer {
    
    /**
     * Converts a raw memory object into a natural, human-readable string.
     * Categorizes memories into Relationship, Budget, Preference, and General.
     */
    public static renderMemory(mem: MemoryItem): { category: string, text: string } {
        if ("interest" in mem) {
            // It's a Preference
            return {
                category: "Preference",
                text: `${mem.relationship_id ? "Recipient" : "User"} prefers ${mem.interest}`
            };
        }

        // It's a General Memory
        const categoryMap: Record<string, string> = {
            "preference": "Preference",
            "budget": "Budget",
            "relationship": "Relationship",
            "behavior": "Behavior"
        };

        const category = (mem.category || "").toLowerCase();
        const displayCat = categoryMap[category] || "General";
        
        let readableText = "";
        if (category === "preference") {
            readableText = `${mem.key === "user" ? "User" : mem.key} likes ${mem.value}`;
        } else if (category === "budget") {
            readableText = `Usually shops around ${mem.value}`;
        } else if (category === "relationship") {
            readableText = `${mem.key}: ${mem.value}`;
        } else {
            readableText = `${mem.key} ${mem.value}`;
        }

        return {
            category: displayCat,
            text: readableText
        };
    }
}
