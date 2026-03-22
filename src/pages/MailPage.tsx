import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, Mail, Loader2 } from 'lucide-react';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useEmails, type RemoteEmail } from '@/hooks/useEmails';
import { mockEmails, mockAccounts } from '@/data/mockData';
import { EmailList } from '@/components/EmailList';
import { EmailViewer } from '@/components/EmailViewer';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Email } from '@/data/mockData';

interface MailPageProps {
  folder: 'inbox' | 'sent' | 'trash';
}

export default function MailPage({ folder }: MailPageProps) {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const { accounts, isLoading: accountsLoading } = useEmailAccounts();
  const { emails: remoteEmails, isLoading: emailsLoading, fetchEmailBody } = useEmails(folder);

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string | null>(null);
  const [localMockEmails, setLocalMockEmails] = useState(mockEmails);
  const [loadingBody, setLoadingBody] = useState(false);

  const hasRealAccounts = accounts.length > 0;

  // Convert remote emails to the Email interface for display
  const convertedRemoteEmails: Email[] = useMemo(() => {
    return remoteEmails.map((re) => ({
      id: `${re.account_id}-${re.uid}`,
      account_id: re.account_id,
      account_name: re.account_name,
      from: re.from,
      from_email: re.from_email,
      to: re.to,
      cc: re.cc,
      subject: re.subject,
      preview: re.preview || re.subject,
      body: re.body || '',
      date: re.date,
      is_read: re.is_read,
      folder,
      has_attachments: re.has_attachments,
    }));
  }, [remoteEmails, folder]);

  // Use real emails if accounts exist, otherwise mock
  const sourceEmails = hasRealAccounts ? convertedRemoteEmails : localMockEmails.filter((e) => e.folder === folder);
  const displayAccounts = hasRealAccounts ? accounts.map(a => ({ id: a.id, friendly_name: a.friendly_name })) : mockAccounts;

  const filteredEmails = useMemo(() => {
    let result = sourceEmails;
    if (filterAccount) result = result.filter((e) => e.account_id === filterAccount);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.from.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sourceEmails, filterAccount, searchQuery]);

  const handleSelectEmail = async (email: Email) => {
    if (hasRealAccounts && !email.body) {
      setSelectedEmail({ ...email, body: '<p>Carregando...</p>' });
      setLoadingBody(true);
      const parts = email.id.split('-');
      const accountId = parts[0];
      const uid = parseInt(parts.slice(1).join('-'));
      const fullEmail = await fetchEmailBody(accountId, uid);
      if (fullEmail) {
        setSelectedEmail({
          ...email,
          body: fullEmail.body || '',
          to: fullEmail.to,
          cc: fullEmail.cc,
        });
      }
      setLoadingBody(false);
    } else {
      setSelectedEmail(email);
    }

    if (!hasRealAccounts) {
      setLocalMockEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e));
    }
  };

  const handleDelete = (id: string) => {
    if (!hasRealAccounts) {
      setLocalMockEmails((prev) => prev.map((e) => e.id === id ? { ...e, folder: 'trash' as const } : e));
    }
    setSelectedEmail(null);
    setDeleteTarget(null);
  };

  const folderLabels = { inbox: 'Caixa de entrada', sent: 'Enviados', trash: 'Lixeira' };
  const isLoading = accountsLoading || (hasRealAccounts && emailsLoading);

  if (accountsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasRealAccounts && mockAccounts.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Nenhuma conta conectada"
        description="Conecte uma conta de e-mail para começar a receber mensagens."
        actionLabel="Adicionar conta de e-mail"
        onAction={() => window.location.href = '/app/contas'}
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* Email list panel */}
      <div className={cn(
        'flex flex-col border-r w-full lg:w-[380px] shrink-0',
        selectedEmail && 'hidden lg:flex'
      )}>
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <h2 className="font-semibold text-sm">{folderLabels[folder]}</h2>
          <span className="text-xs text-muted-foreground">
            ({filteredEmails.length})
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <div className="flex-1" />
        </div>

        {/* Account filter */}
        <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2 scrollbar-thin">
          <Button
            variant={filterAccount === null ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7 shrink-0"
            onClick={() => setFilterAccount(null)}
          >
            Todas
          </Button>
          {displayAccounts.map((acc) => (
            <Button
              key={acc.id}
              variant={filterAccount === acc.id ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => setFilterAccount(acc.id)}
            >
              {acc.friendly_name}
            </Button>
          ))}
        </div>

        {filteredEmails.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nenhum e-mail"
            description={isLoading ? 'Carregando e-mails...' : folder === 'inbox' ? 'Sua caixa de entrada está vazia.' : 'Nenhuma mensagem encontrada.'}
          />
        ) : (
          <EmailList
            emails={filteredEmails}
            activeEmailId={selectedEmail?.id || null}
            onSelectEmail={handleSelectEmail}
          />
        )}
      </div>

      {/* Email viewer panel */}
      <div className={cn(
        'flex-1 min-w-0',
        !selectedEmail && 'hidden lg:flex'
      )}>
        {selectedEmail ? (
          <EmailViewer
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onDelete={(id) => setDeleteTarget(id)}
            onReply={() => {}}
          />
        ) : (
          <div className="hidden lg:flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Selecione uma mensagem para ler</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Excluir e-mail"
        description="Tem certeza que deseja mover este e-mail para a lixeira?"
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        variant="destructive"
      />
    </div>
  );
}
