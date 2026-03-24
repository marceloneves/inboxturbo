import { useState, useMemo } from 'react';
import { Plus, Trash2, Star, CheckCircle2, AlertCircle, Edit2, Loader2, Wifi, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useEmailAccounts, type EmailAccountRow } from '@/hooks/useEmailAccounts';
import { useI18n } from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const providerDefaults: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail: { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587 },
  outlook: { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  yahoo: { imap_host: 'imap.mail.yahoo.com', imap_port: 993, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587 },
};

export default function AccountsPage() {
  const { accounts, isLoading, addAccount, deleteAccount, setDefault, updateAccount, testConnection } = useEmailAccounts();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EmailAccountRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add account form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newProvider, setNewProvider] = useState('gmail');
  const [newImapHost, setNewImapHost] = useState('imap.gmail.com');
  const [newImapPort, setNewImapPort] = useState(993);
  const [newSmtpHost, setNewSmtpHost] = useState('smtp.gmail.com');
  const [newSmtpPort, setNewSmtpPort] = useState(587);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ imap: boolean; smtp: boolean; imap_error: string; smtp_error: string } | null>(null);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter((a) =>
      a.friendly_name.toLowerCase().includes(q) ||
      a.email_address.toLowerCase().includes(q) ||
      a.provider.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  const handleProviderChange = (provider: string) => {
    setNewProvider(provider);
    const defaults = providerDefaults[provider];
    if (defaults) {
      setNewImapHost(defaults.imap_host);
      setNewImapPort(defaults.imap_port);
      setNewSmtpHost(defaults.smtp_host);
      setNewSmtpPort(defaults.smtp_port);
    }
  };

  const resetForm = () => {
    setNewName(''); setNewEmail(''); setNewProvider('gmail');
    setNewImapHost('imap.gmail.com'); setNewImapPort(993);
    setNewSmtpHost('smtp.gmail.com'); setNewSmtpPort(587);
    setNewUsername(''); setNewPassword(''); setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const result = await testConnection.mutateAsync({
        imap_host: newImapHost, imap_port: newImapPort,
        smtp_host: newSmtpHost, smtp_port: newSmtpPort,
        username: newUsername || newEmail, password: newPassword,
      });
      setTestResult(result);
    } catch {
      setTestResult({ imap: false, smtp: false, imap_error: t.accounts.testError, smtp_error: t.accounts.testError });
    }
    setTesting(false);
  };

  const handleAdd = async () => {
    await addAccount.mutateAsync({
      friendly_name: newName, email_address: newEmail, provider: newProvider,
      imap_host: newImapHost, imap_port: newImapPort,
      smtp_host: newSmtpHost, smtp_port: newSmtpPort,
      username: newUsername || newEmail, password: newPassword,
      is_default_sender: accounts.length === 0,
    });
    setAddOpen(false); resetForm();
  };

  const statusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>{t.accounts.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.accounts.subtitle}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t.accounts.addAccount}
        </Button>
      </div>

      {/* Search bar for accounts - always visible */}
      {accounts.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.accounts.searchAccounts}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Wifi className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">{t.accounts.noAccounts}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.accounts.noAccountsDesc}</p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t.accounts.addAccount}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                {acc.friendly_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{acc.friendly_name}</span>
                  {acc.is_default_sender && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Star className="h-3 w-3" /> {t.common.default}
                    </span>
                  )}
                  {statusIcon(acc.connection_status)}
                </div>
                <p className="text-xs text-muted-foreground truncate">{acc.email_address}</p>
                <p className="text-xs text-muted-foreground capitalize">{acc.provider} • {acc.imap_host || 'IMAP'}</p>
              </div>
              <div className="flex items-center gap-1">
                {!acc.is_default_sender && (
                  <Button variant="ghost" size="sm" onClick={() => setDefault.mutate(acc.id)} title={t.accounts.setDefault}>
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditTarget({ ...acc })} title={t.common.edit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(acc.id)} className="text-destructive hover:text-destructive" title={t.common.remove}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add account dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.accounts.addTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.accounts.friendlyName}</Label>
                <Input placeholder={t.accounts.exFriendly} value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.accounts.provider}</Label>
                <Select value={newProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="imap">{t.accounts.otherImap}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.accounts.emailAddress}</Label>
              <Input type="email" placeholder={t.auth.yourEmail} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.accounts.imapServer}</Label>
                <Input value={newImapHost} onChange={(e) => setNewImapHost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.accounts.imapPort}</Label>
                <Input type="number" value={newImapPort} onChange={(e) => setNewImapPort(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.accounts.smtpServer}</Label>
                <Input value={newSmtpHost} onChange={(e) => setNewSmtpHost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.accounts.smtpPort}</Label>
                <Input type="number" value={newSmtpPort} onChange={(e) => setNewSmtpPort(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.accounts.username}</Label>
                <Input placeholder={newEmail || t.auth.yourEmail} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.accounts.passwordLabel}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>

            {newProvider === 'gmail' && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                {t.accounts.gmailTip}{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  myaccount.google.com/apppasswords
                </a>{' '}
                {t.accounts.gmailTipLink}
              </p>
            )}

            {testResult && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {testResult.imap ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>IMAP: {testResult.imap ? t.accounts.connected : testResult.imap_error}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {testResult.smtp ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>SMTP: {testResult.smtp ? t.accounts.connected : testResult.smtp_error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleTest} disabled={!newEmail || !newPassword || testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.accounts.testConnection}
              </Button>
              <Button onClick={handleAdd} disabled={!newName || !newEmail || !newPassword || addAccount.isPending}>
                {addAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.accounts.editTitle}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.accounts.friendlyName}</Label>
                  <Input value={editTarget.friendly_name} onChange={(e) => setEditTarget({ ...editTarget, friendly_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.accounts.provider}</Label>
                  <Select value={editTarget.provider} onValueChange={(v) => {
                    const defaults = providerDefaults[v];
                    setEditTarget({
                      ...editTarget,
                      provider: v,
                      ...(defaults ? { imap_host: defaults.imap_host, imap_port: defaults.imap_port, smtp_host: defaults.smtp_host, smtp_port: defaults.smtp_port } : {}),
                    });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                      <SelectItem value="imap">{t.accounts.otherImap}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t.accounts.emailAddress}</Label>
                <Input type="email" value={editTarget.email_address} onChange={(e) => setEditTarget({ ...editTarget, email_address: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.accounts.imapServer}</Label>
                  <Input value={editTarget.imap_host || ''} onChange={(e) => setEditTarget({ ...editTarget, imap_host: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.accounts.imapPort}</Label>
                  <Input type="number" value={editTarget.imap_port || 993} onChange={(e) => setEditTarget({ ...editTarget, imap_port: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.accounts.smtpServer}</Label>
                  <Input value={editTarget.smtp_host || ''} onChange={(e) => setEditTarget({ ...editTarget, smtp_host: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.accounts.smtpPort}</Label>
                  <Input type="number" value={editTarget.smtp_port || 587} onChange={(e) => setEditTarget({ ...editTarget, smtp_port: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.accounts.username}</Label>
                  <Input value={editTarget.username || ''} onChange={(e) => setEditTarget({ ...editTarget, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.accounts.passwordLabel}</Label>
                  <Input type="password" placeholder={t.accounts.keepEmpty} onChange={(e) => setEditTarget({ ...editTarget, password: e.target.value })} />
                </div>
              </div>

              {editTarget.provider === 'gmail' && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {t.accounts.gmailTip}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)}>{t.common.cancel}</Button>
                <Button
                  disabled={updateAccount.isPending}
                  onClick={() => {
                    const { id, user_id, created_at, updated_at, ...fields } = editTarget;
                    const updates = { ...fields };
                    if (!updates.password) delete updates.password;
                    updateAccount.mutate({ id, ...updates });
                    setEditTarget(null);
                  }}
                >
                  {updateAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.common.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t.accounts.deleteTitle}
        description={t.accounts.deleteDesc.replace('{name}', accounts.find((a) => a.id === deleteTarget)?.friendly_name || '')}
        confirmLabel={t.common.remove}
        cancelLabel={t.common.cancel}
        onConfirm={() => { if (deleteTarget) { deleteAccount.mutate(deleteTarget); setDeleteTarget(null); } }}
        variant="destructive"
      />
    </div>
  );
}
