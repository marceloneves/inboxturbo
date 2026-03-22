import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';

export default function Signup() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    const { error } = await signUp(data.email, data.password, data.name);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
    }
  };

  return <AuthForm mode="signup" onSubmit={handleSubmit} error={error} success={success} />;
}
