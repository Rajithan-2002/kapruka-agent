-- Migration to support database-backed Journey State Snapshots
-- Run this in your Supabase SQL Editor

ALTER TABLE public.shopping_journey 
ADD COLUMN IF NOT EXISTS journey_state JSONB;
