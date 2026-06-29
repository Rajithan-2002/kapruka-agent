-- Database Migration: Enable pgvector and Add Embedding Search to Kappy Few-Shots
-- Description: Adds semantic search capabilities to Kappy few-shot templates.

-- 1. Enable Vector Extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add Vector column of 1536 dimensions (OpenAI text-embedding-3-small)
ALTER TABLE public.kappy_few_shots ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Create similarity matching function (RPC)
CREATE OR REPLACE FUNCTION match_few_shots(
    query_embedding vector(1536), 
    allowed_languages text[], 
    match_limit int
)
RETURNS TABLE (
    id int,
    intent text,
    language text,
    emotion text,
    user_query text,
    assistant_response text,
    similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kappy_few_shots.id,
        kappy_few_shots.intent,
        kappy_few_shots.language,
        kappy_few_shots.emotion,
        kappy_few_shots.user_query,
        kappy_few_shots.assistant_response,
        1 - (kappy_few_shots.embedding <=> query_embedding) AS similarity
    FROM kappy_few_shots
    WHERE kappy_few_shots.language = ANY(allowed_languages)
      AND kappy_few_shots.embedding IS NOT NULL
    ORDER BY kappy_few_shots.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$;
