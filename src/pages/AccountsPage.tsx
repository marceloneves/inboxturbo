import { useState } from 'react';
import { Plus, Trash2, Star, CheckCircle2, AlertCircle, Edit2, Loader2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useEmailAccounts, type EmailAccountRow } from '@/hooks/useEmailAccounts';
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
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EmailAccountRow | null>(null);

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
    setNewName('');
    setNewEmail('');
    setNewProvider('gmail');
    setNewImapHost('imap.gmail.com');
    setNewImapPort(993);
    setNewSmtpHost('smtp.gmail.com');
    setNewSmtpPort(587);
    setNewUsername('');
    setNewPassword('');
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection.mutateAsync({
        imap_host: newImapHost,
        imap_port: newImapPort,
        smtp_host: newSmtpHost,
        smtp_port: newSmtpPort,
        username: newUsername || newEmail,
        password: newPassword,
      });
      setTestResult(result);
    } catch {
      setTestResult({ imap: false, smtp: false, imap_error: 'Erro ao testar', smtp_error: 'Erro ao testar' });
    }
    setTesting(false);
  };

  const handleAdd = async () => {
    await addAccount.mutateAsync({
      friendly_name: newName,
      email_address: newEmail,
      provider: newProvider,
      imap_host: newImapHost,
      imap_port: newImapPort,
      smtp_host: newSmtpHost,
      smtp_port: newSmtpPort,
      username: newUsername || newEmail,
      password: newPassword,
      is_default_sender: accounts.length === 0,
    });
    setAddOpen(false);
    resetForm();
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
          <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>Contas conectadas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas de e-mail</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Wifi className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">Nenhuma conta conectada</h3>
          <p className="text-sm text-muted-foreground mb-4">Conecte uma conta de e-mail para começar.</p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar conta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                {acc.friendly_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{acc.friendly_name}</span>
                  {acc.is_default_sender && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Star className="h-3 w-3" /> Padrão
                    </span>
                  )}
                  {statusIcon(acc.connection_status)}
                </div>
                <p className="text-xs text-muted-foreground truncate">{acc.email_address}</p>
                <p className="text-xs text-muted-foreground capitalize">{acc.provider} • {acc.imap_host || 'IMAP'}</p>
              </div>
              <div className="flex items-center gap-1">
                {!acc.is_default_sender && (
                  <Button variant="ghost" size="sm" onClick={() => setDefault.mutate(acc.id)} title="Definir como padrão">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditTarget({ ...acc })} title="Editar">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(acc.id)} className="text-destructive hover:text-destructive" title="Remover">
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
            <DialogTitle>Adicionar conta de e-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome amigável</Label>
                <Input placeholder="Ex: Pessoal" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Provedor</Label>
                <Select value={newProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="imap">Outro (IMAP/SMTP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Endereço de e-mail</Label>
              <Input type="email" placeholder="seu@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Servidor IMAP</Label>
                <Input value={newImapHost} onChange={(e) => setNewImapHost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Porta IMAP</Label>
                <Input type="number" value={newImapPort} onChange={(e) => setNewImapPort(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Servidor SMTP</Label>
                <Input value={newSmtpHost} onChange={(e) => setNewSmtpHost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Porta SMTP</Label>
                <Input type="number" value={newSmtpPort} onChange={(e) => setNewSmtpPort(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usuário (login)</Label>
                <Input placeholder={newEmail || 'seu@email.com'} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Senha / App Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>

            {newProvider === 'gmail' && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                💡 Para Gmail, use uma <strong>Senha de App</strong> (App Password). Acesse{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  myaccount.google.com/apppasswords
                </a>{' '}
                para gerar uma. É necessário ter verificação em duas etapas ativa.
              </p>
            )}

            {testResult && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {testResult.imap ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>IMAP: {testResult.imap ? 'Conectado' : testResult.imap_error}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {testResult.smtp ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>SMTP: {testResult.smtp ? 'Conectado' : testResult.smtp_error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleTest} disabled={!newEmail || !newPassword || testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar conexão
              </Button>
              <Button onClick={handleAdd} disabled={!newName || !newEmail || !newPassword || addAccount.isPending}>
                {addAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome amigável</Label>
                <Input value={editTarget.friendly_name} onChange={(e) => setEditTarget({ ...editTarget, friendly_name: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
                <Button onClick={() => {
                  updateAccount.mutate({ id: editTarget.id, friendly_name: editTarget.friendly_name } as { id: string; friendly_name: string });
                  setEditTarget(null);
                }}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Remover conta"
        description={`Tem certeza que deseja remover a conta "${accounts.find((a) => a.id === deleteTarget)?.friendly_name}"? Os e-mails permanecerão no servidor de origem.`}
        confirmLabel="Remover"
        onConfirm={() => { if (deleteTarget) { deleteAccount.mutate(deleteTarget); setDeleteTarget(null); } }}
        variant="destructive"
      />
    </div>
  );
}
