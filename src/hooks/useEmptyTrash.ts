import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmptyTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account_id: string) => {
      const { data, error } = await supabase.functions.invoke('empty-trash', {
        body: { account_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Lixeira esvaziada! ${data?.deleted || 0} e-mail(s) excluído(s).`);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao esvaziar lixeira: ${err.message}`);
    },
  });
}
