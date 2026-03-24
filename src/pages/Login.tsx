import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
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
  const { t } = useI18n();
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
      if (errorType === 'email_not_confirmed') { setPendingConfirmationEmail(data.email); return; }
      if (errorType === 'invalid_credentials') { setError(t.auth.wrongCredentials); return; }
      if (errorType === 'rate_limit') { setError(t.auth.tooManyAttempts); return; }
      setError(t.auth.genericLoginError);
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
        if (errorType === 'rate_limit') { setError(t.auth.rateLimitResend); return; }
        setError(t.auth.genericResendError);
        return;
      }
      setSuccess(t.auth.confirmationSent);
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
          <AlertTitle>{t.auth.emailNotConfirmed}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t.auth.emailNotConfirmedDesc} <strong>{pendingConfirmationEmail}</strong>.</p>
            <p>{t.auth.checkSpam}</p>
            <Button type="button" onClick={handleResendConfirmation} disabled={resendingConfirmation} className="w-full">
              {resendingConfirmation ? t.auth.resending : t.auth.resendConfirmation}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    />
  );
}
