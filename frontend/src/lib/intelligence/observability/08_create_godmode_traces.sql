-- Database Schema Update: Kappy God Mode Traces Table
-- Description: Stores unified diagnostic telemetry, product lifecycles, and replay steps

CREATE TABLE IF NOT EXISTS public.godmode_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id TEXT NOT NULL UNIQUE,
    user_id UUID,
    telemetry_events JSONB NULL,        -- Wipe after 7 days
    product_lifecycles JSONB NULL,      -- Wipe after 7 days
    replay_steps JSONB NULL,            -- Wipe after 7 days
    learning_profile JSONB NULL,        -- Wipe after 7 days
    confidence_explanation JSONB NULL,  -- Positive/negative factors list
    session_summary JSONB NOT NULL,     -- Retained forever (Intent, Recipient, Item count, Duration)
    engine_health JSONB NOT NULL,       -- Health status summary of engines
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- For existing tables, make sure the column exists
ALTER TABLE public.godmode_traces ADD COLUMN IF NOT EXISTS learning_profile JSONB NULL;

-- Index for instant key-value lookups by trace ID
CREATE INDEX IF NOT EXISTS idx_godmode_traces_trace_id ON public.godmode_traces(trace_id);

-- Enforce retention policies:
-- Wipe detailed execution events, compressed lifecycles, and replay steps after 7 days to conserve space
-- SELECT cron.schedule('cleanup_detailed_godmode_traces', '0 0 * * *', 
--   $$ UPDATE public.godmode_traces SET telemetry_events = NULL, product_lifecycles = NULL, replay_steps = NULL WHERE created_at < NOW() - INTERVAL '7 days'; $$
-- );
