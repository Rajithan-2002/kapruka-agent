-- Create Community Analytics table for Kappy V1.5
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS community_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    product_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'view', 'expand', 'like', 'dislike', 'bundle_add', 'purchase'
    relationship_type VARCHAR(50),
    occasion_type VARCHAR(50),
    budget_range VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast counts and aggregations
CREATE INDEX IF NOT EXISTS idx_community_analytics_lookup ON community_analytics(product_id, action);
CREATE INDEX IF NOT EXISTS idx_community_analytics_recipient ON community_analytics(relationship_type, action);
