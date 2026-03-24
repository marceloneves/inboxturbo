import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoveEmailParams {
  account_id: string;
  uid: number;
  source_folder: string;
  target_folder: string;
}

export function useMoveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MoveEmailParams) => {
      const { data, error } = await supabase.functions.invoke('move-email', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      const folderLabels: Record<string, string> = {
        inbox: 'Caixa de entrada',
        sent: 'Enviados',
        archive: 'Arquivo',
        trash: 'Lixeira',
      };
      toast.success(`E-mail movido para ${folderLabels[variables.target_folder] || variables.target_folder}`);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao mover e-mail: ' + error.message);
    },
  });
}
