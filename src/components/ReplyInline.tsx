import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendEmail } from '@/hooks/useSendEmail';
import type { Email } from '@/types/email';

interface ReplyInlineProps {
  originalEmail: Email;
  onClose: () => void;
}

export function ReplyInline({ originalEmail, onClose }: ReplyInlineProps) {
  const sendEmail = useSendEmail();
  const [body, setBody] = useState('');

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
    <div className="border-t bg-muted/20 p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Responder para <span className="text-muted-foreground">{originalEmail.from} &lt;{originalEmail.from_email}&gt;</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Textarea
        placeholder="Escreva sua resposta..."
        className="min-h-[120px] resize-none"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSend} disabled={sendEmail.isPending || !body.trim()}>
          {sendEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar resposta
        </Button>
      </div>
    </div>
  );
}
