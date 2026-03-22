import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailAccountRow {
  id: string;
  user_id: string;
  friendly_name: string;
  email_address: string;
  provider: string;
  connection_type: string;
  connection_status: string;
  is_default_sender: boolean;
  imap_host: string | null;
  imap_port: number | null;
  smtp_host: string | null;
  smtp_port: number | null;
  username: string | null;
  password: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['email-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as EmailAccountRow[];
    },
    enabled: !!user,
  });

  const addAccount = useMutation({
    mutationFn: async (account: {
      friendly_name: string;
      email_address: string;
      provider: string;
      imap_host: string;
      imap_port: number;
      smtp_host: string;
      smtp_port: number;
      username: string;
      password: string;
      is_default_sender?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          friendly_name: account.friendly_name,
          email_address: account.email_address,
          provider: account.provider,
          connection_type: 'imap',
          imap_host: account.imap_host,
          imap_port: account.imap_port,
          smtp_host: account.smtp_host,
          smtp_port: account.smtp_port,
          username: account.username,
          password: account.password,
          is_default_sender: account.is_default_sender || false,
        } as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta adicionada com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao adicionar conta: ${err.message}`);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<EmailAccountRow>) => {
      const { error } = await supabase
        .from('email_accounts')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta atualizada.');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta removida.');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      // Clear all defaults first
      await supabase
        .from('email_accounts')
        .update({ is_default_sender: false } as Record<string, unknown>)
        .eq('user_id', user.id);
      // Set new default
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_default_sender: true } as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta padrão atualizada.');
    },
  });

  const testConnection = useMutation({
    mutationFn: async (params: {
      imap_host: string;
      imap_port: number;
      smtp_host: string;
      smtp_port: number;
      username: string;
      password: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('test-email-connection', {
        body: params,
      });
      if (error) throw error;
      return data as { imap: boolean; smtp: boolean; imap_error: string; smtp_error: string };
    },
  });

  return {
    accounts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefault,
    testConnection,
  };
}
