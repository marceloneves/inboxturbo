import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ArchiveEmailParams {
  account_id: string;
  uid: number;
  folder: string;
}

export function useArchiveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ArchiveEmailParams) => {
      const { data, error } = await supabase.functions.invoke('archive-email', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('E-mail arquivado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao arquivar: ${err.message}`);
    },
  });
}
