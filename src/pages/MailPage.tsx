import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, Mail, Loader2, Filter } from 'lucide-react';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useEmails } from '@/hooks/useEmails';
import { useDeleteEmail } from '@/hooks/useDeleteEmail';
import { supabase } from '@/integrations/supabase/client';
import { EmailList } from '@/components/EmailList';
import { EmailViewer } from '@/components/EmailViewer';
import { ComposeInline } from '@/components/ComposeInline';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Email } from '@/types/email';

interface MailPageProps {
  folder: 'inbox' | 'sent' | 'trash';
}

export default function MailPage({ folder }: MailPageProps) {
  const { searchQuery, composing, setComposing } = useOutletContext<{
    searchQuery: string;
    composing: boolean;
    setComposing: (v: boolean) => void;
  }>();
  const { accounts, isLoading: accountsLoading } = useEmailAccounts();
  const { emails: remoteEmails, isLoading: emailsLoading, fetchEmailBody } = useEmails(folder);
  const deleteEmail = useDeleteEmail();

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [loadingBody, setLoadingBody] = useState(false);

  const convertedEmails: Email[] = useMemo(() => {
    return remoteEmails.map((re) => ({
      id: `${re.account_id}::${re.uid}`,
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
      is_read: re.is_read,
      folder,
      has_attachments: re.has_attachments,
    }));
  }, [remoteEmails, folder]);

  const filteredEmails = useMemo(() => {
    let result = convertedEmails;
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
  }, [convertedEmails, filterAccount, searchQuery]);

  const markAsRead = async (accountId: string, uid: number) => {
    try {
      await supabase.functions.invoke('mark-read', {
        body: { account_id: accountId, uid, folder },
      });
    } catch {
      // Silent — non-critical
    }
  };

  const handleSelectEmail = async (email: Email) => {
    setComposing(false);

    const [accountId, uidStr] = email.id.split('::');
    const uid = parseInt(uidStr);

    // Mark as read in background
    if (!email.is_read) {
      markAsRead(accountId, uid);
      // Optimistically update local state
      email = { ...email, is_read: true };
    }

    if (!email.body || email.body.length === 0) {
      setSelectedEmail({ ...email, body: '<p>Carregando...</p>' });
      setLoadingBody(true);
      const fullEmail = await fetchEmailBody(accountId, uid);
      if (fullEmail) {
        setSelectedEmail({
          ...email,
          body: fullEmail.body || '<p>Este e-mail não possui conteúdo exibível.</p>',
          to: fullEmail.to,
          cc: fullEmail.cc,
        });
      } else {
        setSelectedEmail({
          ...email,
          body: '<p>Não foi possível carregar o conteúdo deste e-mail.</p>',
        });
      }
      setLoadingBody(false);
    } else {
      setSelectedEmail(email);
    }
  };

  const handleDelete = async (emailId: string) => {
    const [accountId, uidStr] = emailId.split('::');
    const uid = parseInt(uidStr);

    try {
      await deleteEmail.mutateAsync({ account_id: accountId, uid, folder });
    } catch {
      // Error handled by mutation
    }

    setSelectedEmail(null);
    setDeleteTarget(null);
  };

  const folderLabels = { inbox: 'Caixa de entrada', sent: 'Enviados', trash: 'Lixeira' };
  const isLoading = accountsLoading || emailsLoading;
  const showViewer = selectedEmail || composing;

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
        title="Nenhuma conta conectada"
        description="Conecte uma conta de e-mail para começar a receber mensagens."
        actionLabel="Adicionar conta de e-mail"
        onAction={() => window.location.href = '/app/contas'}
      />
    );
  }

  return (
    <div className="flex h-full">
      <div className={cn(
        'flex flex-col border-r w-full lg:w-[380px] shrink-0',
        showViewer && 'hidden lg:flex'
      )}>
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <h2 className="font-semibold text-sm">{folderLabels[folder]}</h2>
          <span className="text-xs text-muted-foreground">
            ({filteredEmails.length})
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="h-7 w-[160px] text-xs border-0 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.friendly_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      <div className={cn(
        'flex-1 min-w-0',
        !showViewer && 'hidden lg:flex'
      )}>
        {composing ? (
          <ComposeInline onClose={() => setComposing(false)} />
        ) : selectedEmail ? (
          <EmailViewer
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onDelete={(id) => setDeleteTarget(id)}
            isDeleting={deleteEmail.isPending}
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
        description={folder === 'trash' ? 'Este e-mail será excluído permanentemente.' : 'Este e-mail será movido para a lixeira.'}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        variant="destructive"
      />
    </div>
  );
}
