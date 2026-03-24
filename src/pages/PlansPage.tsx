import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Crown, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'pro_monthly',
    name: 'Pro Mensal',
    price: 'R$ 29',
    period: '/mês',
    features: [
      'Contas ilimitadas',
      'Estatísticas avançadas',
      'Suporte prioritário',
      'Intervalo de busca a partir de 30s',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Pro Anual',
    price: 'R$ 249',
    period: '/ano',
    badge: 'Economia de 28%',
    features: [
      'Tudo do plano mensal',
      'Economia de R$ 99/ano',
      'Acesso antecipado a novidades',
      'Intervalo de busca a partir de 30s',
    ],
  },
];

export default function PlansPage() {
  const { isPro, subscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar checkout');
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { return_url: window.location.href },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir portal');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-y-auto h-full animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
          <Crown className="h-4 w-4" />
          Planos
        </div>
        <h1 className="text-3xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground mt-2">
          Desbloqueie todo o potencial do inboxTurbo
        </p>
      </div>

      {isPro && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-center">
          <p className="font-semibold text-primary flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            Você já é Pro!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Seu plano está ativo até{' '}
            {subscription?.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
              : '—'}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handlePortal} disabled={loading === 'portal'}>
            {loading === 'portal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerenciar assinatura
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className={cn(
              'rounded-xl border bg-card p-6 relative',
              i === 1 && 'border-primary shadow-lg'
            )}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                {plan.badge}
              </span>
            )}
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-6"
              variant={i === 1 ? 'default' : 'outline'}
              onClick={() => handleCheckout(plan.id)}
              disabled={isPro || loading === plan.id}
            >
              {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPro ? 'Plano ativo' : 'Assinar agora'}
            </Button>
          </div>
        ))}
      </div>

      {/* Free tier info */}
      <div className="rounded-xl border bg-card p-6 text-center">
        <h3 className="font-semibold">Plano Gratuito</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Até 2 contas conectadas • Intervalo mínimo de 5 min • Estatísticas básicas
        </p>
      </div>
    </div>
  );
}
