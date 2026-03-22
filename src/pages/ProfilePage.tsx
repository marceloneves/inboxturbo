import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // In production, update Supabase profile
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success('Perfil atualizado!');
  };

  return (
    <div className="p-6 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-1" style={{ lineHeight: '1.1' }}>Perfil</h1>
      <p className="text-sm text-muted-foreground mb-6">Seus dados pessoais</p>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={user?.email || ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado aqui.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
