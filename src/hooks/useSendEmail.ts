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
  in_reply_to?: string;
  references?: string;
}

const friendlyError = (msg: string): string => {
  if (msg.includes('ECONNREFUSED')) return 'Conexão recusada pelo servidor SMTP. Verifique host e porta nas configurações da conta.';
  if (msg.includes('ETIMEDOUT') || msg.includes('ESOCKET')) return 'Timeout ao conectar no servidor SMTP. Verifique host e porta.';
  if (msg.includes('Invalid login') || msg.includes('auth') || msg.includes('535')) return 'Credenciais SMTP inválidas. Verifique usuário e senha da conta.';
  if (msg.includes('Credenciais SMTP')) return msg;
  if (msg.includes('Conta não encontrada')) return msg;
  if (msg.includes('Campos obrigatórios')) return msg;
  return `Falha no envio: ${msg}`;
};

export function useSendEmail() {
  return useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: params,
      });

      // supabase.functions.invoke returns the response body in data even on error status
      if (error) {
        // Try to extract server message from data
        const serverMsg = data?.error || error.message || 'Erro desconhecido';
        throw new Error(serverMsg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('E-mail enviado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(friendlyError(err.message));
    },
  });
}
