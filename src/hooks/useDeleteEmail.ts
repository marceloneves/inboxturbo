import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteEmailParams {
  account_id: string;
  uid: number;
  folder: string;
}

export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteEmailParams) => {
      const { data, error } = await supabase.functions.invoke('delete-email', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('E-mail excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir: ${err.message}`);
    },
  });
}
