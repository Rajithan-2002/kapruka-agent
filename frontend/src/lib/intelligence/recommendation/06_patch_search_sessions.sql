-- Migration to support recommendation pool caching in search_sessions table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.search_sessions 
ADD COLUMN IF NOT EXISTS pool_version VARCHAR(255) DEFAULT '1',
ADD COLUMN IF NOT EXISTS refinement_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_exclusions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_price_refinement JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS displayed_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS viewed_pages INT DEFAULT 1;
