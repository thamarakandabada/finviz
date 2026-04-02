-- FinViz Schema
-- Run this against a fresh Supabase/Postgres database.

-- 1. Financial transactions
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

CREATE POLICY "Users manage own transactions"
  ON public.financial_transactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Login rate-limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  banned_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_and_ban_ip(p_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fail_count integer;
BEGIN
  SELECT count(*) INTO fail_count
  FROM login_attempts
  WHERE ip_address = p_ip
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF fail_count >= 3 THEN
    INSERT INTO banned_ips (ip_address)
    VALUES (p_ip)
    ON CONFLICT (ip_address) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
