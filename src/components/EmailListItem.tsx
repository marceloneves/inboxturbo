import { format, isToday, isYesterday } from 'date-fns';
import { enUS, es as esLocale, ptBR } from 'date-fns/locale';
import { Paperclip, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountBadge } from '@/components/AccountBadge';
import { useI18n } from '@/i18n';
import { useLabels, type EmailLabel } from '@/hooks/useLabels';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Email } from '@/types/email';

interface EmailListItemProps {
  email: Email;
  isActive: boolean;
  isPinned?: boolean;
  labels?: EmailLabel[];
  onClick: () => void;
}

const dateLocales = { en: enUS, es: esLocale, pt: ptBR };

export function EmailListItem({ email, isActive, isPinned, labels, onClick }: EmailListItemProps) {
  const { locale, t } = useI18n();
  const { labels: allLabels, assignLabel, removeAssignment } = useLabels();

  const [accountId, uidStr] = email.id.split('::');
  const uid = parseInt(uidStr);
  const assignedIds = (labels || []).map((l) => l.id);

  function formatEmailDate(dateStr: string) {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return t.mail.yesterday;
    return format(date, 'dd MMM', { locale: dateLocales[locale] });
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-email-id', email.id);
    e.dataTransfer.setData('application/x-email-folder', email.folder);
    e.dataTransfer.effectAllowed = 'move';
  };

  const toggleLabel = (label: EmailLabel) => {
    if (assignedIds.includes(label.id)) {
      removeAssignment.mutate({ account_id: accountId, email_uid: uid, label_id: label.id });
    } else {
      assignLabel.mutate({ account_id: accountId, email_uid: uid, label_id: label.id });
    }
  };

  const content = (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors cursor-grab active:cursor-grabbing',
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
            {isPinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
            {email.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{formatEmailDate(email.date)}</span>
          </div>
        </div>
        <p className={cn('truncate text-sm mt-0.5', !email.is_read ? 'font-medium' : 'text-muted-foreground')}>
          {email.subject}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <AccountBadge name={email.account_name} />
          {labels && labels.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white leading-none"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
          <span className="truncate text-xs text-muted-foreground">{email.preview}</span>
        </div>
      </div>
      {!email.is_read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );

  if (allLabels.length === 0) return content;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t.labels.assignLabel}</div>
        {allLabels.map((label) => (
          <ContextMenuItem key={label.id} onClick={() => toggleLabel(label)}>
            <div className="flex items-center gap-2 w-full">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
              <span className="flex-1">{label.name}</span>
              {assignedIds.includes(label.id) && <span className="text-primary text-xs font-bold">✓</span>}
            </div>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
