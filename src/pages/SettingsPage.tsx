import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Lock, RefreshCw, Palette } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Obrigatório'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Senhas não conferem', path: ['confirmPassword'],
});

const intervalOptions = [
  { value: '30', label: '30 segundos' },
  { value: '60', label: '1 minuto' },
  { value: '120', label: '2 minutos' },
  { value: '300', label: '5 minutos' },
  { value: '600', label: '10 minutos' },
  { value: '900', label: '15 minutos' },
  { value: '1800', label: '30 minutos' },
];

export default function SettingsPage() {
  const { updatePassword } = useAuth();
  const { accounts } = useEmailAccounts();
  const { preferences, updatePreferences } = useUserPreferences();
  const { theme, toggleTheme } = useTheme();
  const [changingPw, setChangingPw] = useState(false);
  const [defaultAccount, setDefaultAccount] = useState(
    accounts.find((a) => a.is_default_sender)?.id || ''
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const handleChangePassword = async (data: Record<string, unknown>) => {
    setChangingPw(true);
    const { error } = await updatePassword((data as { newPassword: string }).newPassword);
    setChangingPw(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      reset();
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalize sua experiência</p>
      </div>

      {/* Fetch interval */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Intervalo de busca de e-mails</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Define de quanto em quanto tempo o sistema busca novos e-mails em todas as contas conectadas.
        </p>
        <Select
          value={String(preferences?.fetch_interval_seconds || 60)}
          onValueChange={(v) => updatePreferences.mutate({ fetch_interval_seconds: Number(v) })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {intervalOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Change password */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Alterar senha</h2>
        </div>
        <form onSubmit={handleSubmit(handleChangePassword)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input type="password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message as string}</p>}
          </div>
          <Button type="submit" disabled={changingPw}>
            {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alterar senha
          </Button>
        </form>
      </div>

      {accounts.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">Conta padrão de envio</h2>
          <Select value={defaultAccount} onValueChange={(v) => { setDefaultAccount(v); toast.success('Conta padrão atualizada.'); }}>
            <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.friendly_name} ({acc.email_address})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
