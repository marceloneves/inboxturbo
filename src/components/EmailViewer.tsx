import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Trash2, Reply, Paperclip, Loader2 } from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';
import { Button } from '@/components/ui/button';
import type { Email } from '@/types/email';

interface EmailViewerProps {
  email: Email;
  onBack: () => void;
  onDelete: (id: string) => void;
  onReply: () => void;
  isDeleting?: boolean;
}

export function EmailViewer({ email, onBack, onDelete, onReply, isDeleting }: EmailViewerProps) {
  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onReply}>
          <Reply className="h-4 w-4 mr-1" /> Responder
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(email.id)}
          className="text-destructive hover:text-destructive"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-1" />
          )}
          Excluir
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold" style={{ lineHeight: '1.2' }}>{email.subject}</h2>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {email.from.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{email.from}</span>
                <span className="text-xs text-muted-foreground">&lt;{email.from_email}&gt;</span>
                <AccountBadge name={email.account_name} />
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                <span>Para: {email.to.join(', ')}</span>
                {email.cc && email.cc.length > 0 && <span className="ml-2">Cc: {email.cc.join(', ')}</span>}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(email.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          {email.has_attachments && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Anexos disponíveis</span>
            </div>
          )}

          <div
            className="mt-6 prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </div>
    </div>
  );
}
