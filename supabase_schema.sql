-- Database Schema for Kappy Cloud Database (Supabase PostgreSQL)

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY, -- Links to auth.users.id
    primary_language TEXT NOT NULL DEFAULT 'singlish',
    communication_style TEXT NOT NULL DEFAULT 'casual',
    average_budget INTEGER NOT NULL DEFAULT 6000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Relationships Table
CREATE TABLE IF NOT EXISTS public.relationships (
    id TEXT PRIMARY KEY, -- rel-XXXX
    user_id UUID NOT NULL, -- Links to user_profiles.id
    relationship_type TEXT NOT NULL, -- mother, wife, girlfriend, father, friend, etc.
    nickname TEXT NOT NULL,
    birthday TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Preferences / Interests Table
CREATE TABLE IF NOT EXISTS public.preferences (
    id TEXT PRIMARY KEY, -- pref-XXXX
    user_id UUID NOT NULL, -- Links to user_profiles.id
    relationship_id TEXT REFERENCES public.relationships(id) ON DELETE CASCADE,
    interest TEXT NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    importance_score INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Memories Table
CREATE TABLE IF NOT EXISTS public.memories (
    id TEXT PRIMARY KEY, -- mem-XXXX
    user_id UUID NOT NULL, -- Links to user_profiles.id
    category TEXT NOT NULL, -- preference, relationship, commerce, context
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    importance_score INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- ord-XXXX
    user_id UUID NOT NULL, -- Links to user_profiles.id
    order_number TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    items TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime for live updates (optional)
alter publication supabase_realtime add table public.user_profiles;
alter publication supabase_realtime add table public.relationships;
alter publication supabase_realtime add table public.preferences;
alter publication supabase_realtime add table public.memories;
alter publication supabase_realtime add table public.orders;
