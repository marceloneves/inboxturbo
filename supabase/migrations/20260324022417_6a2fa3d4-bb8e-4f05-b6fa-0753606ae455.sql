
CREATE TABLE public.email_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time_minutes NUMERIC DEFAULT NULL,
  top_senders JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id, stat_date)
);

ALTER TABLE public.email_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
  ON public.email_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.email_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.email_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
