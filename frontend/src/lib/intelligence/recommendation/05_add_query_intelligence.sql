-- Phase 4: Query Intelligence for Product Relevance Ranking

CREATE TABLE IF NOT EXISTS query_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    entity TEXT NOT NULL,
    score NUMERIC DEFAULT 0.0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    confidence NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(normalized_query, entity)
);

-- Index for fast lookup during ranking
CREATE INDEX idx_query_intelligence_normalized_query ON query_intelligence(normalized_query);
