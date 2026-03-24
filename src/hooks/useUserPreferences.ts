import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  density: string;
  fetch_interval_seconds: number;
  default_email_account_id: string | null;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create default preferences
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: created, error: createError } = await (supabase
          .from('user_preferences') as any)
          .insert({ user_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        return created as UserPreferences;
      }
      return data as unknown as UserPreferences;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Pick<UserPreferences, 'theme' | 'density' | 'fetch_interval_seconds' | 'default_email_account_id'>>) => {
      if (!user || !query.data) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('user_preferences') as any)
        .update(updates)
        .eq('id', query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast.success('Preferências salvas.');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences,
    fetchIntervalMs: (query.data?.fetch_interval_seconds || 60) * 1000,
  };
}
