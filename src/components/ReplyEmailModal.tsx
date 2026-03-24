import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendEmail } from '@/hooks/useSendEmail';
import type { Email } from '@/types/email';

interface ReplyEmailModalProps {
  open: boolean;
  onClose: () => void;
  originalEmail: Email;
}

export function ReplyEmailModal({ open, onClose, originalEmail }: ReplyEmailModalProps) {
  const sendEmail = useSendEmail();
  const [body, setBody] = useState('');

  if (!open) return null;

  const handleSend = async () => {
    if (!body.trim()) return;

    const replySubject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    try {
      await sendEmail.mutateAsync({
        account_id: originalEmail.account_id,
        to: originalEmail.from_email,
        subject: replySubject,
        body: `<p>${body.replace(/\n/g, '</p><p>')}</p>
          <br/><hr/>
          <p>Em ${originalEmail.date}, ${originalEmail.from} &lt;${originalEmail.from_email}&gt; escreveu:</p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
            ${originalEmail.body}
          </blockquote>`,
      });
      setBody('');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-xl sm:rounded-xl border bg-card shadow-xl max-h-[90vh] animate-scale-in">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">Responder</h3>
            <p className="text-xs text-muted-foreground truncate">
              Para: {originalEmail.from} &lt;{originalEmail.from_email}&gt;
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Textarea
            placeholder="Escreva sua resposta..."
            className="min-h-[200px] resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
          />

          <div className="rounded-lg border bg-muted/30 p-3 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1">
              Em {new Date(originalEmail.date).toLocaleDateString('pt-BR')}, {originalEmail.from} escreveu:
            </p>
            <div
              className="prose prose-sm max-w-none text-muted-foreground text-xs"
              dangerouslySetInnerHTML={{ __html: originalEmail.body }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sendEmail.isPending || !body.trim()}>
            {sendEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar resposta
          </Button>
        </div>
      </div>
    </div>
  );
}
