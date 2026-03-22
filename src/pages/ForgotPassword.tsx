import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    const { error } = await resetPassword(data.email);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Instruções enviadas! Verifique seu e-mail.');
    }
  };

  return <AuthForm mode="forgot" onSubmit={handleSubmit} error={error} success={success} />;
}
