-- Database Migration: Community Lexicon
-- Description: Creates a table to capture user-taught slang, track votes, and moderate additions to Kappy's global vocabulary.

CREATE TABLE IF NOT EXISTS public.kappy_community_lexicon (
    id SERIAL PRIMARY KEY,
    slang_word TEXT NOT NULL,
    standard_english TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'RELATIONSHIP', 'PRODUCT', 'OCCASION', 'OTHER'
    votes INT DEFAULT 1,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slang_word, standard_english)
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_kappy_community_lexicon_updated_at ON public.kappy_community_lexicon;
CREATE TRIGGER update_kappy_community_lexicon_updated_at
BEFORE UPDATE ON public.kappy_community_lexicon
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for Next.js server access
ALTER TABLE public.kappy_community_lexicon DISABLE ROW LEVEL SECURITY;
