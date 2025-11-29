-- Fix RLS performance by wrapping auth.uid() in subquery
-- This prevents re-evaluation for each row

-- Drop existing policies
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Recreate with optimized auth.uid() calls
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);
