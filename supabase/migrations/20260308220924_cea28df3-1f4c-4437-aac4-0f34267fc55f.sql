
CREATE TABLE public.financial_transactions (
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
ON public.financial_transactions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_fin_tx_user_month ON public.financial_transactions (user_id, upload_month);
CREATE INDEX idx_fin_tx_user_date ON public.financial_transactions (user_id, date);
