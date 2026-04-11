-- FinViz Schema
-- Run this against a fresh Supabase/Postgres database.

-- Financial transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date timestamptz NOT NULL,
  account text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  category text,
  counter_account text,
  note text,
  payee text,
  cleared boolean NOT NULL DEFAULT false,
  upload_month text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Demo users (read-only accounts)
CREATE TABLE IF NOT EXISTS public.demo_users (
  user_id uuid PRIMARY KEY
);

ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;
-- No client-facing policies — only the service role can manage this table.

-- Security-definer function to check if a user is a demo account
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

-- RLS policies for financial_transactions
CREATE POLICY "Users can view own transactions"
  ON public.financial_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.financial_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.financial_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
