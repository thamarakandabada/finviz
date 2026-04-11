-- Allow demo users to insert, update, and delete their own transactions
-- (previously blocked by NOT is_demo_user checks)

DROP POLICY "Non-demo users can insert own transactions" ON public.financial_transactions;
DROP POLICY "Non-demo users can update own transactions" ON public.financial_transactions;
DROP POLICY "Non-demo users can delete own transactions" ON public.financial_transactions;

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
