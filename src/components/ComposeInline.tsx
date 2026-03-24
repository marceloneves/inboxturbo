import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AccountSelector } from '@/components/AccountSelector';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useSendEmail } from '@/hooks/useSendEmail';
import { toast } from 'sonner';

const composeSchema = z.object({
  to: z.string().email('E-mail inválido').max(255),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, 'Assunto obrigatório').max(500),
});

interface ComposeInlineProps {
  onClose: () => void;
}

export function ComposeInline({ onClose }: ComposeInlineProps) {
  const { accounts } = useEmailAccounts();
  const sendEmail = useSendEmail();
  const [body, setBody] = useState('');

  const displayAccounts = accounts.map(a => ({
    id: a.id,
    friendly_name: a.friendly_name,
    email_address: a.email_address,
    is_default_sender: a.is_default_sender,
  }));

  const defaultAccount = displayAccounts.find((a) => a.is_default_sender) || displayAccounts[0];
  const [selectedAccount, setSelectedAccount] = useState(defaultAccount?.id || '');

  useEffect(() => {
    if (!selectedAccount && displayAccounts.length > 0) {
      const def = displayAccounts.find((a) => a.is_default_sender) || displayAccounts[0];
      if (def) setSelectedAccount(def.id);
    }
  }, [displayAccounts, selectedAccount]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(composeSchema),
  });

  const onSubmit = async (data: Record<string, string>) => {
    if (accounts.length === 0) {
      toast.error('Nenhuma conta de e-mail conectada.');
      return;
    }

    if (!body.trim() || body === '<p></p>') {
      toast.error('Mensagem obrigatória.');
      return;
    }

    try {
      await sendEmail.mutateAsync({
        account_id: selectedAccount,
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        body,
      });
      reset();
      setBody('');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Novo e-mail</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label>Conta de envio</Label>
            <AccountSelector
              accounts={displayAccounts}
              value={selectedAccount}
              onValueChange={setSelectedAccount}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compose-to">Para</Label>
            <Input id="compose-to" placeholder="destinatario@email.com" {...register('to')} />
            {errors.to && <p className="text-xs text-destructive">{errors.to.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="compose-cc">Cc</Label>
              <Input id="compose-cc" placeholder="Opcional" {...register('cc')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compose-bcc">Cco</Label>
              <Input id="compose-bcc" placeholder="Opcional" {...register('bcc')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compose-subject">Assunto</Label>
            <Input id="compose-subject" placeholder="Assunto do e-mail" {...register('subject')} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <RichTextEditor
              onChange={setBody}
              placeholder="Escreva sua mensagem..."
              minHeight="200px"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 mt-auto">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={sendEmail.isPending || !selectedAccount}>
            {sendEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
