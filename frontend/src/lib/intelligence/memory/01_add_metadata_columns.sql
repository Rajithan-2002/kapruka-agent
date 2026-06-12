-- Phase 1A: Adding memory metadata columns (Nullable initially for backwards compatibility)

-- 1. Memories Table
ALTER TABLE memories
ADD COLUMN source TEXT NULL,
ADD COLUMN memoryOrigin TEXT NULL,
ADD COLUMN verificationStatus TEXT NULL,
ADD COLUMN lastConfirmedAt TIMESTAMP WITH TIME ZONE NULL;

-- 2. Preferences Table
ALTER TABLE preferences
ADD COLUMN source TEXT NULL,
ADD COLUMN memoryOrigin TEXT NULL,
ADD COLUMN verificationStatus TEXT NULL,
ADD COLUMN lastConfirmedAt TIMESTAMP WITH TIME ZONE NULL;

-- Note: The new columns use the camelCase / PascalCase naming convention
-- where possible to match your desired Typescript interface, 
-- though in Supabase typically snake_case is used. I have used the exact names requested.
-- Feel free to rename to snake_case if your DB convention requires it.
