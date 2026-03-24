import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface EmailLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LabelAssignment {
  id: string;
  user_id: string;
  account_id: string;
  email_uid: number;
  label_id: string;
  created_at: string;
}

export function useLabels() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ['email-labels', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('email_labels')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as EmailLabel[];
    },
    enabled: !!user,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['label-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('email_label_assignments')
        .select('*');
      if (error) throw error;
      return data as unknown as LabelAssignment[];
    },
    enabled: !!user,
  });

  const createLabel = useMutation({
    mutationFn: async (label: { name: string; color: string }) => {
      if (!user) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('email_labels') as any)
        .insert({ user_id: user.id, name: label.name, color: label.color })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-labels'] });
      toast.success(t.labels.labelCreated);
    },
    onError: (err: Error) => {
      toast.error(`${t.labels.labelError}: ${err.message}`);
    },
  });

  const updateLabel = useMutation({
    mutationFn: async (params: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from('email_labels')
        .update({ name: params.name, color: params.color })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-labels'] });
      toast.success(t.labels.labelUpdated);
    },
    onError: (err: Error) => {
      toast.error(`${t.labels.labelError}: ${err.message}`);
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_labels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-labels'] });
      queryClient.invalidateQueries({ queryKey: ['label-assignments'] });
      toast.success(t.labels.labelDeleted);
    },
  });

  const assignLabel = useMutation({
    mutationFn: async (params: { account_id: string; email_uid: number; label_id: string }) => {
      if (!user) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('email_label_assignments') as any)
        .insert({
          user_id: user.id,
          account_id: params.account_id,
          email_uid: params.email_uid,
          label_id: params.label_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-assignments'] });
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async (params: { account_id: string; email_uid: number; label_id: string }) => {
      const { error } = await supabase
        .from('email_label_assignments')
        .delete()
        .eq('account_id', params.account_id)
        .eq('email_uid', params.email_uid)
        .eq('label_id', params.label_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-assignments'] });
    },
  });

  const getLabelsForEmail = (accountId: string, emailUid: number): EmailLabel[] => {
    const assignments = assignmentsQuery.data || [];
    const labels = labelsQuery.data || [];
    const assignedIds = assignments
      .filter((a) => a.account_id === accountId && a.email_uid === emailUid)
      .map((a) => a.label_id);
    return labels.filter((l) => assignedIds.includes(l.id));
  };

  return {
    labels: labelsQuery.data || [],
    assignments: assignmentsQuery.data || [],
    isLoading: labelsQuery.isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeAssignment,
    getLabelsForEmail,
  };
}
