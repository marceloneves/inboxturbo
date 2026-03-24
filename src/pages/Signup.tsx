import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { AuthForm } from '@/components/AuthForm';

type SignupError = Error & { code?: string };

export default function Signup() {
  const { signUp } = useAuth();
  const { t } = useI18n();
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
        setError(t.auth.rateLimitSignup);
        return;
      }
      setError(t.auth.genericSignupError);
    } else {
      setSuccess(t.auth.accountCreated);
    }
  };

  return <AuthForm mode="signup" onSubmit={handleSubmit} error={error} success={success} />;
}
