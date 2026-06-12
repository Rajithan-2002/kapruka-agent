-- Supabase Schema for Kappy Intelligence Engine
-- Run this in your Supabase SQL Editor

-- Table: relationship_profiles
-- Stores the high-level relationship between the user and a specific recipient.
CREATE TABLE relationship_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL, -- The logged-in Kapruka user
  recipient_name VARCHAR(255) NOT NULL, -- e.g., 'Dad', 'Sarah'
  relationship_type VARCHAR(50) NOT NULL, -- e.g., 'FAMILY', 'ROMANTIC', 'FRIEND'
  relationship_strength INT DEFAULT 5 CHECK (relationship_strength >= 1 AND relationship_strength <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, recipient_name)
);

-- Table: recipient_preferences
-- Stores explicit and learned preferences for a recipient.
CREATE TABLE recipient_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES relationship_profiles(id) ON DELETE CASCADE,
  preference_type VARCHAR(50) NOT NULL, -- 'INTEREST', 'DISLIKE', 'FAVORITE_CATEGORY'
  preference_value VARCHAR(255) NOT NULL, -- e.g., 'Cricket', 'Alcohol', 'Cakes'
  confidence_score FLOAT DEFAULT 1.0, -- 1.0 if explicit, lower if inferred
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(profile_id, preference_type, preference_value)
);

-- Table: gift_history
-- Stores past gifts to this recipient to ensure we don't repeat (unless requested)
-- and to learn what works.
CREATE TABLE gift_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES relationship_profiles(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  occasion VARCHAR(255),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  was_successful BOOLEAN, -- Populated by user feedback later
  feedback_notes TEXT
);

-- Table: recommendation_feedback
-- General learning events for the AI
CREATE TABLE learning_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'POSITIVE_SIGNAL', 'NEGATIVE_SIGNAL'
  context JSONB NOT NULL, -- What was recommended vs what was chosen
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE relationship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipient_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- (Add standard policies so users can only select/insert their own data)

-- Table: product_feedback
-- Logs individual relevance feedback events
CREATE TABLE product_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID, -- Optional (can allow anonymous feedback if null)
  product_id VARCHAR(255) NOT NULL,
  recipient VARCHAR(255) DEFAULT 'unknown',
  occasion VARCHAR(255) DEFAULT 'unknown',
  category VARCHAR(255) DEFAULT 'unknown',
  strategy VARCHAR(255) DEFAULT 'unknown',
  context_key VARCHAR(255) NOT NULL,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('RELEVANT', 'NOT_RELEVANT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, product_id, context_key)
);

-- Table: community_relevance_scores
-- Aggregated scores per context
CREATE TABLE community_relevance_scores (
  context_key VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  positive_votes INT DEFAULT 0,
  negative_votes INT DEFAULT 0,
  community_score FLOAT DEFAULT 1.0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (context_key, product_id)
);

ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_relevance_scores ENABLE ROW LEVEL SECURITY;

-- Migration for Recommendation Pool Transparency System V1
-- Run these if the search_sessions table already exists:
-- ALTER TABLE search_sessions ADD COLUMN pool_version VARCHAR(255);
-- ALTER TABLE search_sessions ADD COLUMN refinement_history JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE search_sessions ADD COLUMN active_exclusions JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE search_sessions ADD COLUMN active_price_refinement JSONB DEFAULT NULL;
-- ALTER TABLE search_sessions ADD COLUMN displayed_ids JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE search_sessions ADD COLUMN viewed_pages INT DEFAULT 1;
-- ALTER TABLE search_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
