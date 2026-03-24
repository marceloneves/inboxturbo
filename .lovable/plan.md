

# Plano: Dark Mode + Estatísticas + Stripe

## 1. Dark Mode

O CSS já possui variáveis `.dark` definidas em `index.css`. Falta apenas o mecanismo de toggle.

**Ações:**
- Criar hook `useTheme` que lê/grava a preferência do `user_preferences.theme` e aplica/remove a classe `dark` no `<html>`
- Adicionar botão de toggle (ícone sol/lua) no `AppSidebar` e na `SettingsPage`
- Sincronizar com `localStorage` para aplicação imediata antes do fetch do banco

**Arquivos:** novo `src/hooks/useTheme.ts`, editar `AppSidebar.tsx`, `SettingsPage.tsx`, `index.html` (script inline para evitar flash)

---

## 2. Dashboard de Estatísticas

Como os e-mails não são persistidos no banco (são buscados via IMAP em tempo real), as estatísticas serão coletadas no momento da busca e armazenadas numa nova tabela.

**Ações:**
- Criar tabela `email_stats` via migração:
  - `id`, `user_id`, `account_id`, `date` (DATE), `received_count`, `sent_count`, `avg_response_time_minutes`, `top_senders` (JSONB), `created_at`
  - RLS: usuário só vê os próprios dados
- Criar edge function `collect-stats` que, para cada conta, conecta via IMAP e calcula volume diário, top remetentes e tempo médio de resposta, salvando em `email_stats`
- Criar página `StatsPage` com 4 cards + gráficos usando Recharts (já disponível via chart.tsx):
  - **Volume de e-mails**: gráfico de barras recebidos vs enviados por dia/semana
  - **Tempo de resposta**: gráfico de linha com média por dia
  - **Top remetentes**: lista ranqueada com barras horizontais
  - **E-mails por conta**: gráfico de pizza/donut
- Adicionar rota `/app/estatisticas` e link no sidebar com ícone `BarChart3`
- Botão "Atualizar estatísticas" que invoca a edge function

---

## 3. Integração Stripe (Assinatura Mensal/Anual)

**Ações:**
- Habilitar Stripe via ferramenta `stripe--enable` (coleta a secret key automaticamente)
- Após habilitação, seguir o fluxo nativo do Lovable Stripe para:
  - Criar produtos (ex: Plano Pro mensal, Plano Pro anual)
  - Criar página de pricing `/app/planos` com cards de planos
  - Criar edge function para checkout session e webhook
  - Criar tabela `subscriptions` para rastrear status do usuário
  - Adicionar lógica de gating: verificar se o usuário tem assinatura ativa antes de liberar funcionalidades premium (ex: mais de 2 contas, estatísticas avançadas)
  - Adicionar badge "Pro" no sidebar e opção de gerenciar assinatura no perfil

---

## Ordem de Implementação

1. Dark mode (menor escopo, impacto visual imediato)
2. Tabela + edge function + página de estatísticas
3. Integração Stripe (requer habilitação e configuração externa)

---

## Detalhes Técnicos

- **Migração SQL** para `email_stats` com RLS por `user_id`
- **Recharts** já está disponível no projeto (componente `chart.tsx`)
- **Stripe** será habilitado via ferramenta nativa do Lovable, que gerencia secrets e webhooks automaticamente
- **Theme** usa classe `dark` no `<html>` — todas as variáveis CSS já estão definidas

