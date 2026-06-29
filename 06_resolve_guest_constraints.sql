-- Database Migration: Resolve guest user foreign key constraints
-- Description: Updates user_id foreign keys to reference public.user_profiles(id) instead of auth.users(id).

-- 1. recommendation_traces
ALTER TABLE public.recommendation_traces DROP CONSTRAINT IF EXISTS recommendation_traces_user_id_fkey;
ALTER TABLE public.recommendation_traces 
  ADD CONSTRAINT recommendation_traces_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 2. behavior_profile
ALTER TABLE public.behavior_profile DROP CONSTRAINT IF EXISTS behavior_profile_user_id_fkey;
ALTER TABLE public.behavior_profile 
  ADD CONSTRAINT behavior_profile_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 3. conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.conversations 
  ADD CONSTRAINT conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 4. purchase_history
ALTER TABLE public.purchase_history DROP CONSTRAINT IF EXISTS purchase_history_user_id_fkey;
ALTER TABLE public.purchase_history 
  ADD CONSTRAINT purchase_history_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 5. shopping_journey
ALTER TABLE public.shopping_journey DROP CONSTRAINT IF EXISTS shopping_journey_user_id_fkey;
ALTER TABLE public.shopping_journey 
  ADD CONSTRAINT shopping_journey_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
