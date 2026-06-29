-- ============================================================
-- V3 Migration: Conversations + Chat History Linkage
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast user-specific lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(user_id, updated_at DESC);

-- 2. Link Existing Session IDs to Conversations (Insert placeholders for orphaned sessions in chat_history)
INSERT INTO public.conversations (id, user_id, title, created_at, updated_at)
SELECT session_id, user_id, 'Previous Chat', MIN(created_at), MAX(created_at)
FROM public.chat_history
GROUP BY session_id, user_id
ON CONFLICT (id) DO NOTHING;

-- 3. Add Foreign Key Constraint to chat_history
ALTER TABLE public.chat_history 
ADD CONSTRAINT fk_chat_history_conversation 
FOREIGN KEY (session_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS) for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
