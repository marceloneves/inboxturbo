import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AccountSelector } from '@/components/AccountSelector';
import { mockAccounts } from '@/data/mockData';
import { toast } from 'sonner';

const composeSchema = z.object({
  to: z.string().email('E-mail inválido').max(255),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, 'Assunto obrigatório').max(500),
  body: z.string().min(1, 'Mensagem obrigatória').max(50000),
});

interface ComposeEmailModalProps {
  open: boolean;
  onClose: () => void;
}

export function ComposeEmailModal({ open, onClose }: ComposeEmailModalProps) {
  const [sending, setSending] = useState(false);
  const defaultAccount = mockAccounts.find((a) => a.is_default_sender) || mockAccounts[0];
  const [selectedAccount, setSelectedAccount] = useState(defaultAccount?.id || '');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(composeSchema),
  });

  if (!open) return null;

  const onSubmit = async () => {
    setSending(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    toast.success('E-mail enviado com sucesso!');
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-xl sm:rounded-xl border bg-card shadow-xl max-h-[90vh] animate-scale-in">
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
                accounts={mockAccounts}
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
              <Label htmlFor="compose-body">Mensagem</Label>
              <Textarea
                id="compose-body"
                placeholder="Escreva sua mensagem..."
                className="min-h-[200px] resize-none"
                {...register('body')}
              />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message as string}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={sending || !selectedAccount}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
