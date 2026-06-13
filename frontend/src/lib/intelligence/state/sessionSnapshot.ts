import { createClient } from "@supabase/supabase-js";
import { JourneyState } from "./journeyStateMachine";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const useCloud = !!(supabaseUrl && supabaseKey);
const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null;

export interface SearchSession {
    query?: string;
    recipient?: string;
    occasion?: string;
    budget?: string | number;
    filters?: any;
    shownProducts?: any[];
}

export interface BundleSession {
    items?: any[];
    total?: number;
    recipient?: string;
    occasion?: string;
    budget?: string | number;
}

export interface SessionSnapshot {
    sessionId: string;
    journeyState: JourneyState;
    recipient?: string;
    occasion?: string;
    budget?: string | number;
    activeBundle: any[];
    recommendedProducts: any[];
    searchSession?: SearchSession;
    bundleSession?: BundleSession;
    lastUpdated: string;
}


export class SessionSnapshotEngine {
    // In-memory fallback if Supabase is disabled
    private static snapshotCache = new Map<string, SessionSnapshot>();

    public static async saveSnapshot(sessionId: string, snapshotData: Partial<SessionSnapshot>): Promise<SessionSnapshot> {
        const existing = await this.loadSnapshot(sessionId) || {
            sessionId,
            journeyState: "IDLE" as JourneyState,
            activeBundle: [],
            recommendedProducts: [],
            lastUpdated: new Date().toISOString()
        };

        const updated: SessionSnapshot = {
            ...existing,
            ...snapshotData,
            lastUpdated: new Date().toISOString()
        };

        // Always save to memory cache as a local fallback
        if (this.snapshotCache.size >= 200 && !this.snapshotCache.has(sessionId)) {
            const oldestSessionId = this.snapshotCache.keys().next().value;
            if (oldestSessionId) {
                this.snapshotCache.delete(oldestSessionId);
            }
        }
        this.snapshotCache.set(sessionId, updated);

        if (useCloud && supabase) {
            try {
                const { error } = await supabase
                    .from("shopping_journey")
                    .upsert({
                        id: `jou-${sessionId}`,
                        session_id: sessionId,
                        user_id: "00000000-0000-0000-0000-000000000000", // Fallback guest user ID
                        journey_state: updated,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "id" });

                if (error) {
                    console.error("[SessionSnapshotEngine] saveSnapshot failed:", error.message);
                }
            } catch (err) {
                console.error("[SessionSnapshotEngine] saveSnapshot exception:", err);
            }
        }
        
        return updated;
    }

    public static async loadSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
        if (useCloud && supabase) {
            try {
                const { data, error } = await supabase
                    .from("shopping_journey")
                    .select("journey_state")
                    .eq("session_id", sessionId)
                    .maybeSingle();

                if (error) {
                    console.error("[SessionSnapshotEngine] loadSnapshot failed:", error.message);
                } else if (data && data.journey_state) {
                    return data.journey_state as SessionSnapshot;
                }
            } catch (err) {
                console.error("[SessionSnapshotEngine] loadSnapshot exception:", err);
            }
        }
        // Fallback to local memory cache if database load failed or is empty
        return this.snapshotCache.get(sessionId) || null;
    }
}
