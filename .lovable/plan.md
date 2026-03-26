

# Plano: Manter o App Funcionando Sem Timeout

## Problema

O erro `404: NOT_FOUND` ocorre porque a Edge Function `fetch-emails` excede o limite de CPU (2 segundos) do Supabase ao abrir conexões IMAP. Com o polling automático a cada 60s, após algumas chamadas a função começa a falhar consistentemente, e a lógica atual de backoff (4x o intervalo após 3 falhas) eventualmente para de funcionar.

## Solução

Implementar uma estratégia de resiliência mais robusta no cliente, sem precisar mudar a Edge Function:

### 1. Backoff exponencial com recuperação automática

Quando falhas consecutivas ocorrem, aumentar progressivamente o intervalo de polling (60s → 120s → 240s → 5min max). Quando uma chamada volta a funcionar, resetar imediatamente ao intervalo normal. Isso já existe parcialmente mas precisa ser mais gradual.

### 2. Cache local dos emails com `staleTime`

Configurar `staleTime` no React Query para que os dados em cache sejam considerados válidos por mais tempo (ex: 5 minutos), evitando refetches desnecessários quando o usuário navega entre pastas.

### 3. Pausar polling quando a aba está inativa

Usar `refetchOnWindowFocus: false` e `refetchIntervalInBackground: false` para não fazer chamadas quando o usuário não está olhando para o app. Isso reduz drasticamente a carga na Edge Function.

### 4. Tratamento graceful de erros na UI

Em vez de mostrar o erro 404 bruto, mostrar uma mensagem amigável tipo "Sincronizando..." e manter os dados anteriores visíveis.

## Alterações Técnicas

### `src/hooks/useEmails.ts`
- Adicionar `staleTime: 5 * 60 * 1000` (5 min)
- Adicionar `refetchOnWindowFocus: false`
- Adicionar `refetchIntervalInBackground: false`
- Melhorar backoff: escalar gradualmente (failures * 2 * baseInterval, max 5min)
- Adicionar `gcTime: 10 * 60 * 1000` para manter cache por 10 min

### `src/pages/MailPage.tsx` (ou componente de erro)
- Substituir exibição de erro bruto por mensagem amigável quando há dados em cache disponíveis

Essas mudanças garantem que o app continue funcionando indefinidamente, usando dados em cache quando o servidor falha, e reduzindo a frequência de chamadas para evitar sobrecarregar a Edge Function.

