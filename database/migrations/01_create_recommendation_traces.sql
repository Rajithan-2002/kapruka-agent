-- Database Schema Update: Recommendation Traces
-- Description: Stores diagnostic traces for the recommendation pipeline

CREATE TABLE recommendation_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT,
    mode VARCHAR(50),
    raw_product_count INT,
    filtered_count INT,
    ranked_count INT,
    displayed_count INT,
    trace_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Optional: Create index for faster querying by user or trace id
CREATE INDEX idx_recommendation_traces_user_id ON recommendation_traces(user_id);
CREATE INDEX idx_recommendation_traces_trace_id ON recommendation_traces(trace_id);
