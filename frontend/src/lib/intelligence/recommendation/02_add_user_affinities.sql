-- Phase 3: Adding User Affinities Table for Recommendation Feedback Loop

CREATE TABLE IF NOT EXISTS user_affinities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    target_type TEXT NOT NULL, -- 'product', 'category', or 'tag'
    target_id TEXT NOT NULL,   -- e.g., 'cake', 'electronics', or 'prod_123'
    affinity_score NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- Index for fast lookup by user
CREATE INDEX idx_user_affinities_user_id ON user_affinities(user_id);
