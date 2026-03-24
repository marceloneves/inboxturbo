import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem', path: ['confirmPassword'],
});

const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

const resetSchema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem', path: ['confirmPassword'],
});

type FormMode = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthFormProps {
  mode: FormMode;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  error?: string | null;
  success?: string | null;
  auxiliaryContent?: ReactNode;
}

const schemas = { login: loginSchema, signup: signupSchema, forgot: forgotSchema, reset: resetSchema };

const titles: Record<FormMode, string> = {
  login: 'Entrar no inboxTurbo',
  signup: 'Criar sua conta',
  forgot: 'Recuperar senha',
  reset: 'Redefinir senha',
};

const buttonLabels: Record<FormMode, string> = {
  login: 'Entrar',
  signup: 'Criar conta',
  forgot: 'Enviar instruções',
  reset: 'Redefinir senha',
};

export function AuthForm({ mode, onSubmit, error, success, auxiliaryContent }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
          {mode === 'login' && <p className="mt-2 text-sm text-muted-foreground">Acesse suas contas de e-mail em um só lugar</p>}
          {mode === 'signup' && <p className="mt-2 text-sm text-muted-foreground">Centralize seus e-mails com inboxTurbo</p>}
          {mode === 'forgot' && <p className="mt-2 text-sm text-muted-foreground">Enviaremos instruções para o seu e-mail</p>}
          {mode === 'reset' && <p className="mt-2 text-sm text-muted-foreground">Escolha uma nova senha segura</p>}
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
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" placeholder="Seu nome" className="pl-10" {...register('name')} />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="seu@email.com" className="pl-10" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</Label>
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
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
                <p><Link to="/recuperar-senha" className="text-primary hover:underline">Esqueceu a senha?</Link></p>
                <p className="text-muted-foreground">Não tem conta? <Link to="/cadastro" className="text-primary hover:underline">Criar conta</Link></p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p>
            )}
            {mode === 'forgot' && (
              <p className="text-muted-foreground"><Link to="/login" className="text-primary hover:underline">Voltar ao login</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
