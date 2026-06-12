-- Phase 4: Adding User Evidence and Conflict Queue for Learning Engine

CREATE TABLE IF NOT EXISTS user_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    recipient TEXT NULL, -- E.g., 'mother', 'girlfriend', NULL means global preference
    entity_type TEXT NOT NULL, -- 'product', 'category', 'tag'
    entity_id TEXT NOT NULL,
    positive_signals INTEGER DEFAULT 0,
    negative_signals INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    confidence NUMERIC DEFAULT 0.0,
    last_promotion TIMESTAMP WITH TIME ZONE NULL, -- Used for 90-day cooldown
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipient, entity_type, entity_id)
);

CREATE INDEX idx_user_evidence_user_id ON user_evidence(user_id);

CREATE TABLE IF NOT EXISTS learning_conflict_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    existing_memory_id UUID NOT NULL,
    new_evidence_id UUID NOT NULL,
    status TEXT DEFAULT 'NEEDS_REVIEW', -- 'NEEDS_REVIEW', 'RESOLVED_OVERWRITE', 'RESOLVED_REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE NULL
);
