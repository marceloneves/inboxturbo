import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmailAccounts } from './useEmailAccounts';
import { useUserPreferences } from './useUserPreferences';

export interface RemoteEmail {
  uid: number;
  from: string;
  from_email: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  body?: string;
  date: string;
  is_read: boolean;
  has_attachments: boolean;
  account_id: string;
  account_name: string;
}

export function useEmails(folder: string) {
  const { accounts } = useEmailAccounts();
  const { fetchIntervalMs } = useUserPreferences();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['emails', folder, accounts.map((a) => a.id)],
    queryFn: async () => {
      if (accounts.length === 0) return [];

      const results = await Promise.allSettled(
        accounts.map(async (account) => {
          const { data, error } = await supabase.functions.invoke('fetch-emails', {
            body: { account_id: account.id, folder, page: 1, limit: 50 },
          });
          if (error) {
            console.error(`Error fetching from ${account.friendly_name}:`, error);
            return [];
          }
          return (data?.emails || []).map((e: Omit<RemoteEmail, 'account_id' | 'account_name'>) => ({
            ...e,
            account_id: account.id,
            account_name: account.friendly_name,
          }));
        })
      );

      const allEmails: RemoteEmail[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allEmails.push(...result.value);
        }
      }

      // Sort by date descending
      allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return allEmails;
    },
    enabled: accounts.length > 0,
    refetchInterval: fetchIntervalMs,
  });

  const fetchEmailBody = async (accountId: string, uid: number): Promise<RemoteEmail | null> => {
    const { data, error } = await supabase.functions.invoke('fetch-emails', {
      body: { account_id: accountId, folder, uid },
    });
    if (error || !data?.email) return null;
    const account = accounts.find((a) => a.id === accountId);
    return {
      ...data.email,
      account_id: accountId,
      account_name: account?.friendly_name || '',
    };
  };

  return {
    emails: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    fetchEmailBody,
  };
}
