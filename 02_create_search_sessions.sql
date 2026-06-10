-- Database Schema Update: Search Sessions (Caching & Pagination)
-- Description: Stores product pools after initial MCP retrieval for pagination.

CREATE TABLE search_sessions (
    chat_session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    query TEXT,
    total_products INT,
    displayed_count INT,
    remaining_count INT,
    products JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Optional: Create index for faster querying
CREATE INDEX idx_search_sessions_user_id ON search_sessions(user_id);

-- Alter Recommendation Traces to support V3 metrics
ALTER TABLE recommendation_traces ADD COLUMN IF NOT EXISTS deduplicated_count INT;
ALTER TABLE recommendation_traces ADD COLUMN IF NOT EXISTS cache_remaining INT;

-- Rename retrieved_count or ensure raw_product_count exists
-- Note: V1 already had raw_product_count, but the prompt requested retrieved_count.
-- We'll just stick to raw_product_count and add cache_remaining and deduplicated_count.
