import { godModeStorage } from "./storage";
import { createClient } from "@/lib/supabase/server";

export class LearningEvidenceService {
    public static async getLearningProfile(userId: string) {
        try {
            const supabase = await createClient();
            
            // Fetch learning_events and count actions
            const { data: events } = await supabase
                .from("learning_events")
                .select("action, interest_topic")
                .eq("user_id", userId);

            const counts = {
                searches: 0,
                purchases: 0,
                feedback: 0,
                topics: {} as Record<string, number>
            };

            if (events) {
                events.forEach(e => {
                    const action = (e.action || "").toLowerCase();
                    if (action.includes("search")) counts.searches++;
                    else if (action.includes("purchase")) counts.purchases++;
                    else if (action.includes("feedback") || action.includes("like") || action.includes("dislike")) counts.feedback++;
                    
                    if (e.interest_topic) {
                        counts.topics[e.interest_topic] = (counts.topics[e.interest_topic] || 0) + 1;
                    }
                });
            }

            return {
                userId,
                evidenceCounts: {
                    searches: counts.searches,
                    purchases: counts.purchases,
                    feedback: counts.feedback
                },
                topTopics: Object.entries(counts.topics)
                    .map(([topic, count]) => ({ topic, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
            };
        } catch (err) {
            console.error("Error fetching learning profile for God Mode:", err);
            return {
                userId,
                evidenceCounts: { searches: 0, purchases: 0, feedback: 0 },
                topTopics: []
            };
        }
    }

    public static logMemoryUsage(memoryText: string, status: "USED" | "IGNORED", reason?: string) {
        const store = godModeStorage.getStore();
        if (!store || !store.enabled) return;

        // Ensure we don't log duplicate memory records
        const isDuplicate = store.telemetryEvents.some(
            e => e.engine === "Memory" && e.details?.memory === memoryText
        );
        if (!isDuplicate) {
            store.telemetryEvents.push({
                engine: "Memory",
                status: "COMPLETED",
                timestamp: Date.now() - store.startTime,
                details: {
                    memory: memoryText,
                    utilization: status,
                    reason: reason || (status === "USED" ? "Matches active search context" : "Context mismatch")
                }
            });
        }
    }
}
