import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setError('E-mail ou senha incorretos.');
    } else {
      navigate('/app/inbox');
    }
  };

  return <AuthForm mode="login" onSubmit={handleSubmit} error={error} />;
}
