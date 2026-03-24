import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { AuthForm } from '@/components/AuthForm';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      supabase.auth.getSession();
    }
  }, []);

  const handleSubmit = async (data: Record<string, string>) => {
    setError(null);
    const { error } = await updatePassword(data.password);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t.auth.passwordReset);
      setTimeout(() => navigate('/app/inbox'), 2000);
    }
  };

  return <AuthForm mode="reset" onSubmit={handleSubmit} error={error} success={success} />;
}
