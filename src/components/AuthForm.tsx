import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';

type FormMode = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthFormProps {
  mode: FormMode;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  error?: string | null;
  success?: string | null;
  auxiliaryContent?: ReactNode;
}

export function AuthForm({ mode, onSubmit, error, success, auxiliaryContent }: AuthFormProps) {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t.auth.invalidEmail),
    password: z.string().min(6, t.auth.minChars),
  });

  const signupSchema = z.object({
    name: z.string().min(2, t.auth.nameTooShort).max(100),
    email: z.string().email(t.auth.invalidEmail).max(255),
    password: z.string().min(6, t.auth.minChars),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t.auth.passwordsDontMatch, path: ['confirmPassword'],
  });

  const forgotSchema = z.object({
    email: z.string().email(t.auth.invalidEmail),
  });

  const resetSchema = z.object({
    password: z.string().min(6, t.auth.minChars),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t.auth.passwordsDontMatch, path: ['confirmPassword'],
  });

  const schemas = { login: loginSchema, signup: signupSchema, forgot: forgotSchema, reset: resetSchema };

  const titles: Record<FormMode, string> = {
    login: t.auth.loginTitle,
    signup: t.auth.signupTitle,
    forgot: t.auth.forgotTitle,
    reset: t.auth.resetTitle,
  };

  const subtitles: Record<FormMode, string> = {
    login: t.auth.loginSubtitle,
    signup: t.auth.signupSubtitle,
    forgot: t.auth.forgotSubtitle,
    reset: t.auth.resetSubtitle,
  };

  const buttonLabels: Record<FormMode, string> = {
    login: t.auth.login,
    signup: t.auth.signup,
    forgot: t.auth.sendInstructions,
    reset: t.auth.resetPassword,
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schemas[mode]),
  });

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await onSubmit(data as Record<string, string>);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: '1.1' }}>{titles[mode]}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitles[mode]}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success">{success}</div>
          )}
          {auxiliaryContent && <div className="mb-4">{auxiliaryContent}</div>}

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.auth.name}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" placeholder={t.auth.yourName} className="pl-10" {...register('name')} />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder={t.auth.yourEmail} className="pl-10" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{mode === 'reset' ? t.auth.newPassword : t.auth.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••" className="pl-10 pr-10" {...register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message as string}</p>}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••" className="pl-10" {...register('confirmPassword')} />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message as string}</p>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonLabels[mode]}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <p><Link to="/forgot-password" className="text-primary hover:underline">{t.auth.forgotPassword}</Link></p>
                <p className="text-muted-foreground">{t.auth.noAccount} <Link to="/signup" className="text-primary hover:underline">{t.auth.signup}</Link></p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-muted-foreground">{t.auth.hasAccount} <Link to="/login" className="text-primary hover:underline">{t.auth.login}</Link></p>
            )}
            {mode === 'forgot' && (
              <p className="text-muted-foreground"><Link to="/login" className="text-primary hover:underline">{t.auth.backToLogin}</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
