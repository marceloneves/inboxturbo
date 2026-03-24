
-- Labels/tags for emails
CREATE TABLE public.email_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own labels" ON public.email_labels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own labels" ON public.email_labels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own labels" ON public.email_labels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own labels" ON public.email_labels FOR DELETE USING (auth.uid() = user_id);

-- Label assignments to emails (identified by account_id + uid)
CREATE TABLE public.email_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  email_uid INTEGER NOT NULL,
  label_id UUID NOT NULL REFERENCES public.email_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, email_uid, label_id)
);

ALTER TABLE public.email_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments" ON public.email_label_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assignments" ON public.email_label_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assignments" ON public.email_label_assignments FOR DELETE USING (auth.uid() = user_id);

-- Pinned emails
CREATE TABLE public.pinned_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  email_uid INTEGER NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id, email_uid)
);

ALTER TABLE public.pinned_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pins" ON public.pinned_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pins" ON public.pinned_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pins" ON public.pinned_emails FOR DELETE USING (auth.uid() = user_id);
