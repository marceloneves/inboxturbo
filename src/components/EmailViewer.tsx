import { format } from 'date-fns';
import { enUS, es as esLocale, ptBR } from 'date-fns/locale';
import { ArrowLeft, Trash2, Reply, Paperclip, Loader2, Archive, Pin, PinOff, Tag, Download } from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';
import { Button } from '@/components/ui/button';
import { ReplyInline } from '@/components/ReplyInline';
import { useI18n } from '@/i18n';
import { useLabels, type EmailLabel } from '@/hooks/useLabels';
import { usePinnedEmails } from '@/hooks/usePinnedEmails';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Email, EmailAttachment } from '@/types/email';
import { useState } from 'react';

interface EmailViewerProps {
  email: Email;
  onBack: () => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  isDeleting?: boolean;
  isArchiving?: boolean;
}

const dateLocales = { en: enUS, es: esLocale, pt: ptBR };
const dateFormats = {
  en: "MMMM d, yyyy 'at' HH:mm",
  es: "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
  pt: "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailViewer({ email, onBack, onDelete, onArchive, isDeleting, isArchiving }: EmailViewerProps) {
  const [replying, setReplying] = useState(false);
  const [downloadingPart, setDownloadingPart] = useState<string | null>(null);
  const { t, locale } = useI18n();
  const { labels, getLabelsForEmail, assignLabel, removeAssignment } = useLabels();
  const { isPinned, pinEmail, unpinEmail } = usePinnedEmails();

  const [accountId, uidStr] = email.id.split('::');
  const uid = parseInt(uidStr);
  const emailIsPinned = isPinned(accountId, uid);
  const emailLabels = getLabelsForEmail(accountId, uid);
  const emailLabelIds = emailLabels.map((l) => l.id);

  const togglePin = () => {
    if (emailIsPinned) {
      unpinEmail.mutate({ account_id: accountId, email_uid: uid });
    } else {
      pinEmail.mutate({ account_id: accountId, email_uid: uid });
    }
  };

  const toggleLabel = (label: EmailLabel) => {
    if (emailLabelIds.includes(label.id)) {
      removeAssignment.mutate({ account_id: accountId, email_uid: uid, label_id: label.id });
    } else {
      assignLabel.mutate({ account_id: accountId, email_uid: uid, label_id: label.id });
    }
  };

  const handleDownloadAttachment = async (att: EmailAttachment) => {
    setDownloadingPart(att.part);
    try {
      const { data, error } = await supabase.functions.invoke('download-attachment', {
        body: { account_id: accountId, folder: email.folder, uid, part: att.part },
      });
      if (error || !data?.data) {
        toast.error('Erro ao baixar anexo');
        return;
      }
      const byteString = atob(data.data);
      const ab = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ab[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: att.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar anexo');
    } finally {
      setDownloadingPart(null);
    }
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />

        {/* Pin button */}
        <Button variant="ghost" size="sm" onClick={togglePin}>
          {emailIsPinned ? <PinOff className="h-4 w-4 mr-1" /> : <Pin className="h-4 w-4 mr-1" />}
          {emailIsPinned ? t.mail.unpin : t.mail.pin}
        </Button>

        {/* Labels dropdown */}
        {labels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Tag className="h-4 w-4 mr-1" /> {t.labels.assignLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {labels.map((label) => (
                <DropdownMenuItem key={label.id} onClick={() => toggleLabel(label)}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                    <span className="flex-1">{label.name}</span>
                    {emailLabelIds.includes(label.id) && <span className="text-primary text-xs">✓</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="sm" onClick={() => setReplying(true)} disabled={replying}>
          <Reply className="h-4 w-4 mr-1" /> {t.reply.reply}
        </Button>
        {onArchive && (
          <Button variant="ghost" size="sm" onClick={() => onArchive(email.id)} disabled={isArchiving}>
            {isArchiving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Archive className="h-4 w-4 mr-1" />}
            {t.reply.archive}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onDelete(email.id)} className="text-destructive hover:text-destructive" disabled={isDeleting}>
          {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
          {t.reply.delete}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold" style={{ lineHeight: '1.2' }}>{email.subject}</h2>

            {/* Labels display */}
            {emailLabels.length > 0 && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {emailLabels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

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
                  <span>{t.mail.to}: {email.to.join(', ')}</span>
                  {email.cc && email.cc.length > 0 && <span className="ml-2">{t.mail.cc}: {email.cc.join(', ')}</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(email.date), dateFormats[locale], { locale: dateLocales[locale] })}
                </span>
              </div>
            </div>

            {/* Attachments */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip className="h-4 w-4" />
                  <span>{t.mail.attachmentsAvailable} ({email.attachments.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((att, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownloadAttachment(att)}
                      disabled={downloadingPart === att.part}
                      className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]">{att.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                      </div>
                      {downloadingPart === att.part ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {email.has_attachments && (!email.attachments || email.attachments.length === 0) && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t.mail.attachmentsAvailable}</span>
              </div>
            )}

            <div
              className="mt-6 prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          </div>
        </div>

        {replying && (
          <ReplyInline originalEmail={email} onClose={() => setReplying(false)} />
        )}
      </div>
    </div>
  );
}
