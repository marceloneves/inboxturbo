

## Arquivar E-mails via IMAP (sem banco de dados)

Sim, é possível. O protocolo IMAP suporta mover mensagens entre pastas diretamente no servidor de e-mail. Arquivar = mover o e-mail da Inbox para a pasta "Archive" (ou equivalente) no servidor remoto.

### Como funciona

O fluxo é idêntico ao de exclusão que já existe (`delete-email`): conectar via IMAP, abrir a pasta de origem e mover a mensagem para a pasta de arquivo. Nenhum dado é armazenado localmente.

### Plano de implementação

**1. Criar Edge Function `archive-email`**
- Baseada na estrutura do `delete-email/index.ts` existente
- Em vez de mover para Trash, move para a pasta de arquivo do servidor
- Tenta pastas comuns: `[Gmail]/Todos os e-mails`, `[Gmail]/All Mail`, `Archive`, `INBOX.Archive`
- Recebe `account_id`, `uid`, `folder` (origem)

**2. Criar hook `useArchiveEmail`**
- Similar ao `useDeleteEmail.ts`
- Invoca a função `archive-email`
- Invalida o cache de e-mails após sucesso
- Tratamento de erro amigável

**3. Adicionar botão "Arquivar" no `EmailViewer.tsx`**
- Ícone `Archive` do lucide-react ao lado dos botões Responder/Excluir
- Estado de loading durante a operação
- Após arquivar, volta para a lista

**4. Adicionar pasta "Arquivo" na navegação**
- Nova rota `/app/arquivo` no `AppLayout`/router
- Novo `NavLink` na sidebar com ícone Archive
- `MailPage` com `folder='archive'`
- Mapeamento da pasta IMAP no `fetch-emails` para buscar e-mails arquivados

**5. Adicionar diálogo de confirmação**
- Reutilizar o `ConfirmDialog` existente antes de arquivar

### Arquivos envolvidos
- **Novo:** `supabase/functions/archive-email/index.ts`
- **Novo:** `src/hooks/useArchiveEmail.ts`
- **Editados:** `EmailViewer.tsx`, `MailPage.tsx`, `AppSidebar.tsx`, `App.tsx` (rotas)
- **Editado:** `supabase/functions/fetch-emails/index.ts` (mapeamento da pasta archive)

