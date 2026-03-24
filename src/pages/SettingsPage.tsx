import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTheme } from '@/hooks/useTheme';
import { useUiStyle } from '@/hooks/useUiStyle';
import { useI18n, type Locale } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Lock, RefreshCw, Palette, Globe, Paintbrush, Check } from 'lucide-react';
import { UI_STYLE_LABELS, UI_STYLE_PREVIEW_COLORS, type UiStyleName } from '@/lib/themes';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { updatePassword } = useAuth();
  const { accounts } = useEmailAccounts();
  const { preferences, updatePreferences } = useUserPreferences();
  const { theme, toggleTheme } = useTheme();
  const { style: uiStyle, setStyle: setUiStyle } = useUiStyle();
  const { t, locale, setLocale } = useI18n();
  const [changingPw, setChangingPw] = useState(false);
  const [defaultAccount, setDefaultAccount] = useState(
    accounts.find((a) => a.is_default_sender)?.id || ''
  );

  const passwordSchema = z.object({
    currentPassword: z.string().min(1, t.settings.required),
    newPassword: z.string().min(6, t.auth.minChars),
    confirmPassword: z.string(),
  }).refine((d) => d.newPassword === d.confirmPassword, {
    message: t.auth.passwordsDontMatch, path: ['confirmPassword'],
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const intervalOptions = [
    { value: '30', label: t.settings.intervals['30'] },
    { value: '60', label: t.settings.intervals['60'] },
    { value: '120', label: t.settings.intervals['120'] },
    { value: '300', label: t.settings.intervals['300'] },
    { value: '600', label: t.settings.intervals['600'] },
    { value: '900', label: t.settings.intervals['900'] },
    { value: '1800', label: t.settings.intervals['1800'] },
  ];

  const handleChangePassword = async (data: Record<string, unknown>) => {
    setChangingPw(true);
    const { error } = await updatePassword((data as { newPassword: string }).newPassword);
    setChangingPw(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.auth.passwordChanged);
      reset();
    }
  };

  const handleStyleChange = (style: UiStyleName) => {
    setUiStyle(style);
    toast.success(t.settings.styleSaved);
  };

  const styleKeys: UiStyleName[] = ['warm', 'blue', 'mono', 'rustic', 'purple'];

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      {/* Language */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t.settings.language}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{t.settings.languageDesc}</p>
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Theme */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t.settings.theme}</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t.settings.darkMode}</p>
            <p className="text-xs text-muted-foreground">{t.settings.darkModeDesc}</p>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </div>
      </div>

      {/* Interface Style */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Paintbrush className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t.settings.interfaceStyle}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t.settings.interfaceStyleDesc}</p>
        <div className="grid grid-cols-1 gap-3">
          {styleKeys.map((key) => {
            const isActive = uiStyle === key;
            const colors = UI_STYLE_PREVIEW_COLORS[key];
            return (
              <button
                key={key}
                onClick={() => handleStyleChange(key)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                  isActive
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex gap-1.5 shrink-0">
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border border-border/50"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium flex-1">{UI_STYLE_LABELS[key]}</span>
                {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fetch interval */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t.settings.fetchInterval}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{t.settings.fetchIntervalDesc}</p>
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
          <h2 className="font-semibold">{t.settings.changePassword}</h2>
        </div>
        <form onSubmit={handleSubmit(handleChangePassword)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t.settings.currentPassword}</Label>
            <Input type="password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t.settings.newPassword}</Label>
            <Input type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t.settings.confirmNewPassword}</Label>
            <Input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message as string}</p>}
          </div>
          <Button type="submit" disabled={changingPw}>
            {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.settings.changePasswordBtn}
          </Button>
        </form>
      </div>

      {accounts.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">{t.settings.defaultSendAccount}</h2>
          <Select value={defaultAccount} onValueChange={(v) => { setDefaultAccount(v); toast.success(t.accounts.defaultUpdated); }}>
            <SelectTrigger><SelectValue placeholder={t.settings.selectAccount} /></SelectTrigger>
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
