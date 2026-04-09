-- 1. Create demo_users table
CREATE TABLE public.demo_users (
  user_id uuid PRIMARY KEY
);

ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;

-- Only service role can manage demo_users (no client access needed)
-- No RLS policies = no client access by default with RLS enabled

-- 2. Security-definer function to check demo status
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_users WHERE user_id = _user_id
  )
$$;

-- 3. Drop the old ALL policy
DROP POLICY IF EXISTS "Users manage own transactions" ON public.financial_transactions;

-- 4. Create granular policies
-- SELECT: all authenticated users can read their own data
CREATE POLICY "Users can view own transactions"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: only non-demo users
CREATE POLICY "Non-demo users can insert own transactions"
  ON public.financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- UPDATE: only non-demo users
CREATE POLICY "Non-demo users can update own transactions"
  ON public.financial_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- DELETE: only non-demo users
CREATE POLICY "Non-demo users can delete own transactions"
  ON public.financial_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));