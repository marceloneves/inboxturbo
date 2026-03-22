import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountBadge } from '@/components/AccountBadge';
import type { Email } from '@/data/mockData';

interface EmailListItemProps {
  email: Email;
  isActive: boolean;
  onClick: () => void;
}

function formatEmailDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd MMM', { locale: ptBR });
}

export function EmailListItem({ email, isActive, onClick }: EmailListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors',
        isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50',
        !email.is_read && 'bg-card'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', !email.is_read && 'font-semibold')}>
            {email.from}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {email.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{formatEmailDate(email.date)}</span>
          </div>
        </div>
        <p className={cn('truncate text-sm mt-0.5', !email.is_read ? 'font-medium' : 'text-muted-foreground')}>
          {email.subject}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <AccountBadge name={email.account_name} />
          <span className="truncate text-xs text-muted-foreground">{email.preview}</span>
        </div>
      </div>
      {!email.is_read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
