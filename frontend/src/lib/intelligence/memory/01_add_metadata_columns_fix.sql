-- Phase 1B: Rename columns to snake_case to fix Supabase PostgREST Schema Caching Errors

-- 1. Memories Table
ALTER TABLE memories RENAME COLUMN memoryorigin TO memory_origin;
ALTER TABLE memories RENAME COLUMN verificationstatus TO verification_status;
ALTER TABLE memories RENAME COLUMN lastconfirmedat TO last_confirmed_at;

-- 2. Preferences Table
ALTER TABLE preferences RENAME COLUMN memoryorigin TO memory_origin;
ALTER TABLE preferences RENAME COLUMN verificationstatus TO verification_status;
ALTER TABLE preferences RENAME COLUMN lastconfirmedat TO last_confirmed_at;
