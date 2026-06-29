-- ============================================================
-- V2 Migration: Personalization Engine + Recommendation Intelligence
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. purchase_history — Tracks every product interaction (viewed, purchased, reordered, added_to_bundle)
CREATE TABLE IF NOT EXISTS public.purchase_history (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('viewed', 'purchased', 'reordered', 'added_to_bundle')),
    session_context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups by user and product/category
CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON public.purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_product ON public.purchase_history(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_category ON public.purchase_history(user_id, product_category);

-- 2. behavior_profile — Tracks user preferences, pricing range, and relationship status
CREATE TABLE IF NOT EXISTS public.behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_categories TEXT[] DEFAULT '{}'::text[],
    favorite_price_range JSONB DEFAULT '{"min": 0, "max": 0, "avg": 0}'::jsonb,
    total_purchases INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    relationship_strength DOUBLE PRECISION DEFAULT 0.0,
    personality_stage TEXT DEFAULT 'new_acquaintance' CHECK (personality_stage IN ('new_acquaintance', 'familiar', 'trusted_friend', 'best_friend')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. shopping_journey — Tracks multi-stage shopping sessions (e.g. Stage 1: Cake selection, Stage 2: Decorations)
CREATE TABLE IF NOT EXISTS public.shopping_journey (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    occasion TEXT,
    recipient TEXT,
    stages JSONB DEFAULT '[]'::jsonb, -- Array of stages: [{"stage": "cake", "status": "completed"}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups by session
CREATE INDEX IF NOT EXISTS idx_shopping_journey_session ON public.shopping_journey(user_id, session_id);

-- Enable RLS for all new tables
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_journey ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can read own purchase history" ON public.purchase_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchase history" ON public.purchase_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own behavior profile" ON public.behavior_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior profile" ON public.behavior_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own behavior profile" ON public.behavior_profile FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own shopping journey" ON public.shopping_journey FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopping journey" ON public.shopping_journey FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shopping journey" ON public.shopping_journey FOR UPDATE USING (auth.uid() = user_id);

-- Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_journey;
