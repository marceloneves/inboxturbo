import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { AuthForm } from '@/components/AuthForm';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    const { error } = await resetPassword(data.email);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t.auth.instructionsSent);
    }
  };

  return <AuthForm mode="forgot" onSubmit={handleSubmit} error={error} success={success} />;
}
