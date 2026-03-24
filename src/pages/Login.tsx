import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type AuthError = Error & { code?: string };

function getAuthErrorType(error: AuthError) {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message.toLowerCase();

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'email_not_confirmed';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'invalid_credentials';
  if (message.includes('security purposes') || message.includes('rate limit')) return 'rate_limit';

  return 'unknown';
}

export default function Login() {
  const { signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    setSuccess(null);
    setPendingConfirmationEmail(null);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      const errorType = getAuthErrorType(error as AuthError);

      if (errorType === 'email_not_confirmed') {
        setPendingConfirmationEmail(data.email);
        return;
      }

      if (errorType === 'invalid_credentials') {
        setError('E-mail ou senha incorretos.');
        return;
      }

      if (errorType === 'rate_limit') {
        setError('Muitas tentativas seguidas. Aguarde um instante e tente novamente.');
        return;
      }

      setError('Não foi possível entrar agora. Tente novamente em instantes.');
    } else {
      navigate('/app/inbox');
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail) return;

    setError(null);
    setSuccess(null);
    setResendingConfirmation(true);

    try {
      const { error } = await resendConfirmation(pendingConfirmationEmail);

      if (error) {
        const errorType = getAuthErrorType(error as AuthError);
        if (errorType === 'rate_limit') {
          setError('Aguarde alguns segundos antes de pedir um novo link de confirmação.');
          return;
        }

        setError('Não foi possível reenviar o link agora. Tente novamente em instantes.');
        return;
      }

      setSuccess('Enviamos um novo link de confirmação. Verifique sua caixa de entrada e também o spam.');
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      onSubmit={handleSubmit}
      error={error}
      success={success}
      auxiliaryContent={pendingConfirmationEmail ? (
        <Alert>
          <AlertTitle>E-mail pendente de confirmação</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Seu cadastro foi criado, mas você ainda precisa clicar no link enviado para <strong>{pendingConfirmationEmail}</strong>.
            </p>
            <p>Se não encontrar a mensagem, verifique também a pasta de spam.</p>
            <Button type="button" onClick={handleResendConfirmation} disabled={resendingConfirmation} className="w-full">
              {resendingConfirmation ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    />
  );
}
