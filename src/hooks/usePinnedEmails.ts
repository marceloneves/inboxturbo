import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePinnedEmails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pinned-emails', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pinned_emails')
        .select('*')
        .order('pinned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as { id: string; user_id: string; account_id: string; email_uid: number; pinned_at: string }[];
    },
    enabled: !!user,
  });

  const pinEmail = useMutation({
    mutationFn: async (params: { account_id: string; email_uid: number }) => {
      if (!user) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('pinned_emails') as any)
        .insert({ user_id: user.id, account_id: params.account_id, email_uid: params.email_uid });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-emails'] });
    },
  });

  const unpinEmail = useMutation({
    mutationFn: async (params: { account_id: string; email_uid: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('pinned_emails')
        .delete()
        .eq('user_id', user.id)
        .eq('account_id', params.account_id)
        .eq('email_uid', params.email_uid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-emails'] });
    },
  });

  const isPinned = (accountId: string, emailUid: number): boolean => {
    return (query.data || []).some(
      (p) => p.account_id === accountId && p.email_uid === emailUid
    );
  };

  return {
    pinnedEmails: query.data || [],
    isLoading: query.isLoading,
    pinEmail,
    unpinEmail,
    isPinned,
  };
}
