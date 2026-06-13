import { createClient } from '../supabase/server';

export interface SearchSession {
    chat_session_id: string;
    user_id?: string;
    query: string;
    total_products: number;
    displayed_count: number;
    displayed_ids?: string[];
    remaining_count: number;
    products: any[];
    pool_version?: string;
    refinement_history?: string[];
    active_exclusions?: { target: string; strength: string }[];
    active_price_refinement?: {
        sort_order?: "ASC" | "DESC" | "CHEAPER" | "PREMIUM";
        min_price?: number;
        max_price?: number;
    };
    viewed_pages?: number;
    created_at?: string;
}

// Bounded in-memory fallback cache for guest/offline scenarios
const searchSessionCache = new Map<string, SearchSession>();

export async function saveSearchSession(session: SearchSession) {
    // Always save to local memory cache first
    searchSessionCache.set(session.chat_session_id, session);
    if (searchSessionCache.size > 200) {
        const oldestId = searchSessionCache.keys().next().value;
        if (oldestId) {
            searchSessionCache.delete(oldestId);
        }
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase.from('search_sessions').upsert({
            chat_session_id: session.chat_session_id,
            user_id: session.user_id,
            query: session.query,
            total_products: session.total_products,
            displayed_count: session.displayed_count,
            displayed_ids: session.displayed_ids || [],
            remaining_count: session.remaining_count,
            products: session.products,
            pool_version: session.pool_version || `pool-${Date.now()}`,
            refinement_history: session.refinement_history || [],
            active_exclusions: session.active_exclusions || [],
            active_price_refinement: session.active_price_refinement || null,
            viewed_pages: session.viewed_pages || 1,
            created_at: session.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        if (error) {
            console.error('[SearchSessions] Upsert failed:', error.message);
        }
    } catch (e) {
        console.error("Failed to save search session", e);
    }
}

export async function getSearchSession(chatSessionId: string, userId: string): Promise<SearchSession | null> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('search_sessions')
            .select('*')
            .eq('chat_session_id', chatSessionId)
            .eq('user_id', userId)
            .single();
            
        if (!error && data) return data as SearchSession;
    } catch (e) {
        console.error("Failed to get search session from database", e);
    }
    // Fallback to local memory cache
    return searchSessionCache.get(chatSessionId) || null;
}
