import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Trash2, Star, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { mockAccounts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EmailAccount } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>(mockAccounts);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EmailAccount | null>(null);

  // Add account form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newProvider, setNewProvider] = useState('gmail');

  const handleAdd = () => {
    if (!newName || !newEmail) return;
    const newAccount: EmailAccount = {
      id: `acc-${Date.now()}`,
      friendly_name: newName,
      email_address: newEmail,
      provider: newProvider,
      connection_status: 'connected',
      is_default_sender: accounts.length === 0,
    };
    setAccounts([...accounts, newAccount]);
    setAddOpen(false);
    setNewName('');
    setNewEmail('');
    toast.success('Conta adicionada com sucesso!');
  };

  const handleDelete = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
    setDeleteTarget(null);
    toast.success('Conta removida.');
  };

  const handleSetDefault = (id: string) => {
    setAccounts(accounts.map((a) => ({ ...a, is_default_sender: a.id === id })));
    toast.success('Conta padrão atualizada.');
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    setAccounts(accounts.map((a) => a.id === editTarget.id ? editTarget : a));
    setEditTarget(null);
    toast.success('Conta atualizada.');
  };

  const statusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

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
              <p className="text-xs text-muted-foreground capitalize">{acc.provider}</p>
            </div>
            <div className="flex items-center gap-1">
              {!acc.is_default_sender && (
                <Button variant="ghost" size="sm" onClick={() => handleSetDefault(acc.id)} title="Definir como padrão">
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

      {/* Add account dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar conta de e-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome amigável</Label>
              <Input placeholder="Ex: Pessoal, Comercial" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço de e-mail</Label>
              <Input type="email" placeholder="seu@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Provedor</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook</SelectItem>
                  <SelectItem value="yahoo">Yahoo</SelectItem>
                  <SelectItem value="imap">IMAP/SMTP</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={!newName || !newEmail}>Salvar</Button>
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
                <Button onClick={handleEditSave}>Salvar</Button>
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
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        variant="destructive"
      />
    </div>
  );
}
