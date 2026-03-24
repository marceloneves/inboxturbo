import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { Loader2, BarChart3, Clock, Users, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  'hsl(215 80% 55%)',
  'hsl(142 60% 45%)',
  'hsl(280 65% 55%)',
  'hsl(38 80% 50%)',
  'hsl(0 62% 45%)',
];

const volumeConfig: ChartConfig = {
  received: { label: 'Recebidos', color: 'hsl(215 80% 55%)' },
  sent: { label: 'Enviados', color: 'hsl(142 60% 45%)' },
};

const responseConfig: ChartConfig = {
  avg: { label: 'Média (min)', color: 'hsl(280 65% 55%)' },
};

interface StatRow {
  id: string;
  user_id: string;
  account_id: string;
  stat_date: string;
  received_count: number;
  sent_count: number;
  avg_response_time_minutes: number | null;
  top_senders: Array<{ email: string; count: number }>;
  created_at: string;
}

export default function StatsPage() {
  const { user } = useAuth();
  const { accounts } = useEmailAccounts();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['email-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('email_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('stat_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as StatRow[];
    },
    enabled: !!user,
  });

  const [collecting, setCollecting] = useState(false);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const { error } = await supabase.functions.invoke('collect-stats');
      if (error) throw error;
      toast.success('Estatísticas atualizadas!');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao coletar estatísticas');
    } finally {
      setCollecting(false);
    }
  };

  // Volume data: group by date
  const volumeData = useMemo(() => {
    if (!stats?.length) return [];
    const map = new Map<string, { date: string; received: number; sent: number }>();
    for (const s of stats) {
      const existing = map.get(s.stat_date) || { date: s.stat_date, received: 0, sent: 0 };
      existing.received += s.received_count;
      existing.sent += s.sent_count;
      map.set(s.stat_date, existing);
    }
    return Array.from(map.values()).slice(-14);
  }, [stats]);

  // Response time data
  const responseData = useMemo(() => {
    if (!stats?.length) return [];
    const map = new Map<string, { date: string; values: number[] }>();
    for (const s of stats) {
      if (s.avg_response_time_minutes == null) continue;
      const existing = map.get(s.stat_date) || { date: s.stat_date, values: [] };
      existing.values.push(s.avg_response_time_minutes);
      map.set(s.stat_date, existing);
    }
    return Array.from(map.values())
      .map(d => ({ date: d.date, avg: Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length) }))
      .slice(-14);
  }, [stats]);

  // Top senders aggregate
  const topSenders = useMemo(() => {
    if (!stats?.length) return [];
    const map = new Map<string, number>();
    for (const s of stats) {
      if (!Array.isArray(s.top_senders)) continue;
      for (const sender of s.top_senders) {
        map.set(sender.email, (map.get(sender.email) || 0) + sender.count);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }));
  }, [stats]);

  // Per account distribution
  const accountData = useMemo(() => {
    if (!stats?.length) return [];
    const map = new Map<string, number>();
    for (const s of stats) {
      map.set(s.account_id, (map.get(s.account_id) || 0) + s.received_count + s.sent_count);
    }
    return Array.from(map.entries()).map(([id, total]) => {
      const acc = accounts.find(a => a.id === id);
      return { name: acc?.friendly_name || id.slice(0, 8), value: total };
    });
  }, [stats, accounts]);

  // Summary cards
  const totalReceived = stats?.reduce((s, r) => s + r.received_count, 0) || 0;
  const totalSent = stats?.reduce((s, r) => s + r.sent_count, 0) || 0;
  const avgResponse = responseData.length
    ? Math.round(responseData.reduce((s, r) => s + r.avg, 0) / responseData.length)
    : null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>Estatísticas</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus e-mails</p>
        </div>
        <Button onClick={handleCollect} disabled={collecting} variant="outline" size="sm">
          {collecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Mail} label="Recebidos" value={totalReceived} />
        <SummaryCard icon={Mail} label="Enviados" value={totalSent} />
        <SummaryCard icon={Clock} label="Tempo resp. médio" value={avgResponse != null ? `${avgResponse} min` : '—'} />
        <SummaryCard icon={Users} label="Top remetente" value={topSenders[0]?.email?.split('@')[0] || '—'} />
      </div>

      {stats?.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma estatística coletada ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Atualizar" para coletar dados das suas contas.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Volume chart */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-3">Volume de e-mails</h3>
            <ChartContainer config={volumeConfig} className="h-[250px] w-full">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Response time chart */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-3">Tempo médio de resposta</h3>
            <ChartContainer config={responseConfig} className="h-[250px] w-full">
              <LineChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="avg" stroke="var(--color-avg)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Top senders */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-3">Top remetentes</h3>
            <div className="space-y-2">
              {topSenders.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
              {topSenders.map((s, i) => {
                const maxCount = topSenders[0]?.count || 1;
                return (
                  <div key={s.email} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm truncate">{s.email}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(s.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per account pie */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-3">E-mails por conta</h3>
            {accountData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {accountData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold truncate">{value}</p>
    </div>
  );
}
