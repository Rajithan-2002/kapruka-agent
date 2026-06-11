import { createClient } from '../supabase/server';

export interface SearchSession {
    chat_session_id: string;
    user_id?: string;
    query: string;
    total_products: number;
    displayed_count: number;
    remaining_count: number;
    products: any[];
}

export async function saveSearchSession(session: SearchSession) {
    try {
        const supabase = await createClient();
        await supabase.from('search_sessions').upsert({
            chat_session_id: session.chat_session_id,
            user_id: session.user_id,
            query: session.query,
            total_products: session.total_products,
            displayed_count: session.displayed_count,
            remaining_count: session.remaining_count,
            products: session.products,
            updated_at: new Date().toISOString()
        });
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
            
        if (error || !data) return null;
        return data as SearchSession;
    } catch (e) {
        console.error("Failed to get search session", e);
        return null;
    }
}
