-- Phase 5: Adding Observability Trace Store for Debugging & Replay

CREATE TABLE IF NOT EXISTS intelligence_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id TEXT NOT NULL,
    decision_id TEXT NOT NULL,
    engine TEXT NOT NULL,
    status TEXT NOT NULL, -- 'HEALTHY', 'DEGRADED', 'ERROR'
    duration_ms INTEGER NOT NULL,
    input_snapshot JSONB NULL,
    output_snapshot JSONB NULL,
    error_code TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by trace ID (essential for Replay Engine and Judge Mode)
CREATE INDEX idx_intelligence_traces_trace_id ON intelligence_traces(trace_id);
CREATE INDEX idx_intelligence_traces_engine ON intelligence_traces(engine);

-- Note: A 30-day retention policy should be enforced. 
-- In Supabase, this can be done via pg_cron:
-- SELECT cron.schedule('cleanup_traces', '0 0 * * *', $$ DELETE FROM intelligence_traces WHERE created_at < NOW() - INTERVAL '30 days'; $$);
