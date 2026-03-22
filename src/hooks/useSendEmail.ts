import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendEmailParams {
  account_id: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('E-mail enviado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    },
  });
}
