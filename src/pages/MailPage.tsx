import { useState, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, Mail, Loader2, Filter, Trash2 } from 'lucide-react';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useEmails } from '@/hooks/useEmails';
import { useDeleteEmail } from '@/hooks/useDeleteEmail';
import { useArchiveEmail } from '@/hooks/useArchiveEmail';
import { useEmptyTrash } from '@/hooks/useEmptyTrash';
import { usePinnedEmails } from '@/hooks/usePinnedEmails';
import { useLabels } from '@/hooks/useLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { EmailList } from '@/components/EmailList';
import { EmailViewer } from '@/components/EmailViewer';
import { ComposeInline } from '@/components/ComposeInline';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Email, EmailAttachment } from '@/types/email';

interface MailPageProps {
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
}

export default function MailPage({ folder }: MailPageProps) {
  const { searchQuery, composing, setComposing } = useOutletContext<{
    searchQuery: string;
    composing: boolean;
    setComposing: (v: boolean) => void;
  }>();
  const { accounts, isLoading: accountsLoading } = useEmailAccounts();
  const { emails: remoteEmails, isLoading: emailsLoading, error: emailsError, refetch, fetchEmailBody } = useEmails(folder);
  const deleteEmail = useDeleteEmail();
  const archiveEmail = useArchiveEmail();
  const emptyTrash = useEmptyTrash();
  const { isPinned } = usePinnedEmails();
  const { getLabelsForEmail } = useLabels();
  const isMobile = useIsMobile();
  const { t } = useI18n();

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [loadingBody, setLoadingBody] = useState(false);
  const [bodyLoadError, setBodyLoadError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const bodyCache = useRef<Map<string, { body: string; to: string[]; cc?: string[]; attachments?: EmailAttachment[] }>>(new Map());

  const convertedEmails: Email[] = useMemo(() => {
    return remoteEmails
      .filter((re) => !removedIds.has(`${re.account_id}::${re.uid}`))
      .map((re) => {
        const id = `${re.account_id}::${re.uid}`;
        return {
          id,
          account_id: re.account_id,
          account_name: re.account_name,
          from: re.from,
          from_email: re.from_email,
          to: re.to,
          cc: re.cc,
          subject: re.subject,
          preview: re.preview || re.subject,
          body: re.body || undefined,
          date: re.date,
          is_read: re.is_read || readIds.has(id),
          folder,
          has_attachments: re.has_attachments,
        };
      });
  }, [remoteEmails, folder, readIds, removedIds]);

  // Sort: pinned first, then by date
  const sortedEmails = useMemo(() => {
    const sorted = [...convertedEmails];
    sorted.sort((a, b) => {
      const [aAccId, aUidStr] = a.id.split('::');
      const [bAccId, bUidStr] = b.id.split('::');
      const aPinned = isPinned(aAccId, parseInt(aUidStr));
      const bPinned = isPinned(bAccId, parseInt(bUidStr));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return sorted;
  }, [convertedEmails, isPinned]);

  const filteredEmails = useMemo(() => {
    let result = sortedEmails;
    if (filterAccount !== 'all') result = result.filter((e) => e.account_id === filterAccount);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.from.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sortedEmails, filterAccount, searchQuery]);

  const filteredAccountsForSelect = useMemo(() => {
    if (!accountSearch) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter((a) =>
      a.friendly_name.toLowerCase().includes(q) ||
      a.email_address.toLowerCase().includes(q)
    );
  }, [accounts, accountSearch]);

  const markAsRead = useCallback(async (accountId: string, uid: number) => {
    try {
      await supabase.functions.invoke('mark-read', {
        body: { account_id: accountId, uid, folder },
      });
    } catch { /* Silent */ }
  }, [folder]);

  const handleSelectEmail = useCallback(async (email: Email) => {
    setComposing(false);
    setBodyLoadError(null);
    const [accountId, uidStr] = email.id.split('::');
    const uid = parseInt(uidStr);
    if (!email.is_read) {
      setReadIds((prev) => new Set(prev).add(email.id));
      markAsRead(accountId, uid);
      email = { ...email, is_read: true };
    }
    const cached = bodyCache.current.get(email.id);
    if (cached) { setSelectedEmail({ ...email, body: cached.body, to: cached.to, cc: cached.cc, attachments: cached.attachments }); return; }
    if (email.body && email.body.length > 0) { setSelectedEmail(email); return; }
    setSelectedEmail({ ...email, body: `<p>${t.common.loading}</p>` });
    setLoadingBody(true);
    const fullEmail = await fetchEmailBody(accountId, uid);
    if (fullEmail) {
      const body = fullEmail.body || '<p>—</p>';
      bodyCache.current.set(email.id, { body, to: fullEmail.to, cc: fullEmail.cc, attachments: fullEmail.attachments });
      setSelectedEmail({ ...email, body, to: fullEmail.to, cc: fullEmail.cc, attachments: fullEmail.attachments });
    } else {
      setSelectedEmail(email);
      setBodyLoadError('body-load-error');
    }
    setLoadingBody(false);
  }, [setComposing, markAsRead, fetchEmailBody, t]);

  const handleDelete = async (emailId: string) => {
    const [accountId, uidStr] = emailId.split('::');
    const uid = parseInt(uidStr);
    setRemovedIds((prev) => new Set(prev).add(emailId));
    bodyCache.current.delete(emailId);
    setSelectedEmail(null);
    setDeleteTarget(null);
    try {
      await deleteEmail.mutateAsync({ account_id: accountId, uid, folder });
    } catch {
      setRemovedIds((prev) => { const next = new Set(prev); next.delete(emailId); return next; });
    }
  };

  const handleArchive = async (emailId: string) => {
    const [accountId, uidStr] = emailId.split('::');
    const uid = parseInt(uidStr);
    setRemovedIds((prev) => new Set(prev).add(emailId));
    bodyCache.current.delete(emailId);
    setSelectedEmail(null);
    try {
      await archiveEmail.mutateAsync({ account_id: accountId, uid, folder });
    } catch {
      setRemovedIds((prev) => { const next = new Set(prev); next.delete(emailId); return next; });
    }
  };

  const handleEmptyTrash = async () => {
    setEmptyTrashConfirm(false);
    setSelectedEmail(null);
    bodyCache.current.clear();
    const targetAccounts = filterAccount === 'all' ? accounts : accounts.filter(a => a.id === filterAccount);
    for (const acc of targetAccounts) {
      try { await emptyTrash.mutateAsync(acc.id); } catch { /* handled */ }
    }
  };

  const isLoading = accountsLoading || emailsLoading;
  const showViewer = selectedEmail || composing;

  // Helper to get labels for an email
  const getEmailLabels = (email: Email) => {
    const [accId, uidStr] = email.id.split('::');
    return getLabelsForEmail(accId, parseInt(uidStr));
  };

  const getIsPinned = (email: Email) => {
    const [accId, uidStr] = email.id.split('::');
    return isPinned(accId, parseInt(uidStr));
  };

  // Account filter component
  const AccountFilter = () => (
    <div className="flex items-center gap-1.5">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={filterAccount} onValueChange={setFilterAccount}>
        <SelectTrigger className="h-8 w-[220px] text-xs border-0 bg-muted/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accounts.length > 5 && (
            <div className="px-2 pb-1.5">
              <Input
                placeholder={t.accounts.searchAccounts}
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="h-7 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <SelectItem value="all">{t.common.allAccounts}</SelectItem>
          {filteredAccountsForSelect.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.friendly_name} ({acc.email_address})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (accountsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title={t.mail.noAccountsTitle}
        description={t.mail.noAccountsDesc}
        actionLabel={t.mail.addEmailAccount}
        onAction={() => window.location.href = '/app/accounts'}
      />
    );
  }

  const EmailListWithFeatures = () => (
    <>
      {filteredEmails.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t.mail.noEmails}
          description={isLoading ? t.mail.loadingEmails : folder === 'inbox' ? t.mail.inboxEmpty : t.mail.noMessagesFound}
        />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredEmails.map((email) => (
            <EmailList
              key={email.id}
              emails={[email]}
              activeEmailId={selectedEmail?.id || null}
              onSelectEmail={handleSelectEmail}
              isPinnedFn={getIsPinned}
              getLabelsFn={getEmailLabels}
            />
          ))}
        </div>
      )}
    </>
  );

  const ListHeader = () => (
    <div className="flex items-center gap-2 border-b px-4 py-2.5">
      <h2 className="font-semibold text-sm">{t.mail.folderLabels[folder]}</h2>
      <span className="text-xs text-muted-foreground">({filteredEmails.length})</span>
      {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {folder === 'trash' && filteredEmails.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setEmptyTrashConfirm(true)} disabled={emptyTrash.isPending}>
          {emptyTrash.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
          {t.mail.emptyTrash}
        </Button>
      )}
      <div className="flex-1" />
      <AccountFilter />
    </div>
  );

  return (
    <div className="flex h-full">
      {isMobile ? (
        <>
          {showViewer ? (
            <div className="flex-1 min-w-0">
              {composing ? (
                <ComposeInline onClose={() => setComposing(false)} />
             ) : selectedEmail ? (
               bodyLoadError && !loadingBody ? (
                 <ErrorState
                   message="Não foi possível carregar o conteúdo deste e-mail agora. Tente novamente em instantes."
                   onRetry={() => handleSelectEmail(selectedEmail)}
                 />
               ) : (
                 <EmailViewer
                   email={selectedEmail}
                   onBack={() => setSelectedEmail(null)}
                   onDelete={(id) => setDeleteTarget(id)}
                   onArchive={folder !== 'archive' ? handleArchive : undefined}
                   isDeleting={deleteEmail.isPending}
                   isArchiving={archiveEmail.isPending}
                 />
               )
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col w-full">
              <ListHeader />
               {emailsError && filteredEmails.length === 0 ? (
                 <ErrorState
                   message="Não foi possível sincronizar os e-mails agora. Tente novamente em instantes."
                   onRetry={() => refetch()}
                 />
               ) : filteredEmails.length === 0 ? (
                <EmptyState icon={Inbox} title={t.mail.noEmails} description={isLoading ? t.mail.loadingEmails : folder === 'inbox' ? t.mail.inboxEmpty : t.mail.noMessagesFound} />
              ) : (
                <EmailList
                  emails={filteredEmails}
                  activeEmailId={selectedEmail?.id || null}
                  onSelectEmail={handleSelectEmail}
                  isPinnedFn={getIsPinned}
                  getLabelsFn={getEmailLabels}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <ResizablePanelGroup direction="horizontal" autoSaveId="mail-panel-sizes">
          <ResizablePanel defaultSize={38} minSize={25} maxSize={55}>
            <div className="flex h-full flex-col">
              <ListHeader />
              {filteredEmails.length === 0 ? (
                <EmptyState icon={Inbox} title={t.mail.noEmails} description={isLoading ? t.mail.loadingEmails : folder === 'inbox' ? t.mail.inboxEmpty : t.mail.noMessagesFound} />
              ) : (
                <EmailList
                  emails={filteredEmails}
                  activeEmailId={selectedEmail?.id || null}
                  onSelectEmail={handleSelectEmail}
                  isPinnedFn={getIsPinned}
                  getLabelsFn={getEmailLabels}
                />
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={62}>
            {composing ? (
              <ComposeInline onClose={() => setComposing(false)} />
             ) : selectedEmail ? (
               bodyLoadError && !loadingBody ? (
                 <ErrorState
                   message="Não foi possível carregar o conteúdo deste e-mail agora. Tente novamente em instantes."
                   onRetry={() => handleSelectEmail(selectedEmail)}
                 />
               ) : (
                 <EmailViewer
                   email={selectedEmail}
                   onBack={() => setSelectedEmail(null)}
                   onDelete={(id) => setDeleteTarget(id)}
                   onArchive={folder !== 'archive' ? handleArchive : undefined}
                   isDeleting={deleteEmail.isPending}
                   isArchiving={archiveEmail.isPending}
                 />
               )
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Mail className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{t.mail.selectMessage}</p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t.mail.deleteEmail}
        description={folder === 'trash' ? t.mail.deleteEmailTrash : t.mail.deleteEmailMove}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        variant="destructive"
      />

      <ConfirmDialog
        open={emptyTrashConfirm}
        onOpenChange={() => setEmptyTrashConfirm(false)}
        title={t.mail.emptyTrashTitle}
        description={t.mail.emptyTrashDesc}
        confirmLabel={t.mail.empty}
        cancelLabel={t.common.cancel}
        onConfirm={handleEmptyTrash}
        variant="destructive"
      />
    </div>
  );
}
