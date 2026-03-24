import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';

type SignupError = Error & { code?: string };

export default function Signup() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    setSuccess(null);

    const { error } = await signUp(data.email, data.password, data.name);

    if (error) {
      const message = error.message.toLowerCase();
      const code = (error as SignupError).code?.toLowerCase() ?? '';

      if (message.includes('security purposes') || message.includes('rate limit') || code.includes('rate')) {
        setError('Aguarde alguns segundos antes de solicitar outro e-mail de confirmação.');
        return;
      }

      setError('Não foi possível criar sua conta agora. Tente novamente em instantes.');
    } else {
      setSuccess('Conta criada! Abra o link enviado para seu e-mail antes de entrar. Se não encontrar, verifique o spam.');
    }
  };

  return <AuthForm mode="signup" onSubmit={handleSubmit} error={error} success={success} />;
}
