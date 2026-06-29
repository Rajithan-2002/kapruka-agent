-- Database Schema Update: Stored Conversations for Analysis
-- Description: Stores evaluated test runner conversations, turns, outcomes, and compiled God Mode traces for analysis and few-shot extraction.

CREATE TABLE IF NOT EXISTS public.stored_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    language TEXT NOT NULL,
    persona_detected JSONB NULL,
    turns JSONB NOT NULL, -- Array of turn evaluations containing user message, kappy response, intent, verdict, issues, and turn-level logs
    outcome TEXT NOT NULL DEFAULT 'BROWSED', -- ORDER_PLACED, ABANDONED, BROWSED
    products_shown TEXT[] NULL,
    products_ordered TEXT[] NULL,
    godmode_traces JSONB NULL, -- Compiled God Mode trace telemetry for all turns in the session
    overall_verdict TEXT NOT NULL, -- PASS, FAIL, WARNING
    metadata JSONB NULL, -- Scenario ID, title, mode, dynamic details, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_stored_conversations_session_id ON public.stored_conversations(session_id);

-- Disable Row Level Security (RLS) for analytical table to allow test runner to write to it using the anon key
ALTER TABLE public.stored_conversations DISABLE ROW LEVEL SECURITY;
