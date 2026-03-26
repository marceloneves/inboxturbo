import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmailAccounts } from './useEmailAccounts';
import { useUserPreferences } from './useUserPreferences';
import { useRef } from 'react';
import type { EmailAttachment } from '@/types/email';

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
  attachments?: EmailAttachment[];
}

async function fetchWithRetry(
  accountId: string,
  folder: string,
  friendlyName: string,
  retries = 2
): Promise<RemoteEmail[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-emails', {
        body: { account_id: accountId, folder, page: 1, limit: 50 },
      });
      if (error) {
        // Check for timeout/NOT_FOUND errors
        const errMsg = typeof error === 'object' && error !== null
          ? (error as { message?: string }).message || String(error)
          : String(error);
        if ((errMsg.includes('NOT_FOUND') || errMsg.includes('504') || errMsg.includes('timeout')) && attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        console.error(`Error fetching from ${friendlyName}:`, error);
        return [];
      }
      return (data?.emails || []).map((e: Omit<RemoteEmail, 'account_id' | 'account_name'>) => ({
        ...e,
        account_id: accountId,
        account_name: friendlyName,
      }));
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`Error fetching from ${friendlyName}:`, err);
      return [];
    }
  }
  return [];
}

export function useEmails(folder: string) {
  const { accounts } = useEmailAccounts();
  const { fetchIntervalMs } = useUserPreferences();
  const queryClient = useQueryClient();
  const consecutiveFailures = useRef(0);

  const getRefetchInterval = () => {
    const failures = consecutiveFailures.current;
    if (failures === 0) return fetchIntervalMs;
    // Exponential backoff: base * 2^failures, max 5 min
    return Math.min(fetchIntervalMs * Math.pow(2, failures), 300000);
  };

  const query = useQuery({
    queryKey: ['emails', folder, accounts.map((a) => a.id)],
    queryFn: async () => {
      if (accounts.length === 0) return [];

      const results = await Promise.allSettled(
        accounts.map((account) =>
          fetchWithRetry(account.id, folder, account.friendly_name)
        )
      );

      const allEmails: RemoteEmail[] = [];
      let anySuccess = false;
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length >= 0) {
          anySuccess = true;
          allEmails.push(...result.value);
        }
      }

      if (anySuccess) {
        consecutiveFailures.current = 0;
      } else {
        consecutiveFailures.current++;
      }

      allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return allEmails;
    },
    enabled: accounts.length > 0,
    refetchInterval: getRefetchInterval(),
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 1,
    retryDelay: 2000,
  });

  const fetchEmailBody = async (accountId: string, uid: number): Promise<RemoteEmail | null> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-emails', {
          body: { account_id: accountId, folder, uid },
        });
        if (error) {
          const errMsg = typeof error === 'object' && error !== null
            ? (error as { message?: string }).message || String(error)
            : String(error);
          if ((errMsg.includes('NOT_FOUND') || errMsg.includes('timeout')) && attempt === 0) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          return null;
        }
        if (!data?.email) return null;
        const account = accounts.find((a) => a.id === accountId);
        return {
          ...data.email,
          account_id: accountId,
          account_name: account?.friendly_name || '',
        };
      } catch {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return null;
      }
    }
    return null;
  };

  return {
    emails: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    fetchEmailBody,
  };
}
