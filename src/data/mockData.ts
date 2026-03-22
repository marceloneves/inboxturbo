export interface EmailAccount {
  id: string;
  friendly_name: string;
  email_address: string;
  provider: string;
  connection_status: 'connected' | 'error' | 'disconnected';
  is_default_sender: boolean;
}

export interface Email {
  id: string;
  account_id: string;
  account_name: string;
  from: string;
  from_email: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  body: string;
  date: string;
  is_read: boolean;
  folder: 'inbox' | 'sent' | 'trash';
  has_attachments?: boolean;
}

export const mockAccounts: EmailAccount[] = [
  { id: 'acc-1', friendly_name: 'Pessoal', email_address: 'lucas.martins@gmail.com', provider: 'gmail', connection_status: 'connected', is_default_sender: true },
  { id: 'acc-2', friendly_name: 'Comercial', email_address: 'lucas@minhaempresa.com.br', provider: 'outlook', connection_status: 'connected', is_default_sender: false },
  { id: 'acc-3', friendly_name: 'Suporte', email_address: 'suporte@minhaempresa.com.br', provider: 'imap', connection_status: 'connected', is_default_sender: false },
];

export const mockEmails: Email[] = [
  {
    id: 'e-1', account_id: 'acc-1', account_name: 'Pessoal',
    from: 'Ana Carolina', from_email: 'ana.carol@outlook.com',
    to: ['lucas.martins@gmail.com'],
    subject: 'Reunião de planejamento — terça-feira',
    preview: 'Oi Lucas, gostaria de confirmar nossa reunião de planejamento para terça-feira às 14h...',
    body: '<p>Oi Lucas,</p><p>Gostaria de confirmar nossa reunião de planejamento para terça-feira às 14h. Vamos discutir os próximos passos do projeto e definir as metas do trimestre.</p><p>Pode confirmar sua presença?</p><p>Abraço,<br/>Ana Carolina</p>',
    date: '2026-03-22T10:30:00', is_read: false, folder: 'inbox',
  },
  {
    id: 'e-2', account_id: 'acc-2', account_name: 'Comercial',
    from: 'Rafael Souza', from_email: 'rafael.souza@clienteabc.com',
    to: ['lucas@minhaempresa.com.br'],
    subject: 'Proposta comercial — Projeto Alpha',
    preview: 'Prezado Lucas, segue em anexo a proposta comercial referente ao Projeto Alpha...',
    body: '<p>Prezado Lucas,</p><p>Segue em anexo a proposta comercial referente ao Projeto Alpha conforme conversamos na última reunião. O valor total contempla todas as fases descritas no escopo.</p><p>Aguardo seu retorno.</p><p>Atenciosamente,<br/>Rafael Souza<br/>Diretor Comercial — Cliente ABC</p>',
    date: '2026-03-22T09:15:00', is_read: false, folder: 'inbox', has_attachments: true,
  },
  {
    id: 'e-3', account_id: 'acc-3', account_name: 'Suporte',
    from: 'Mariana Oliveira', from_email: 'mariana@clientexyz.com',
    to: ['suporte@minhaempresa.com.br'],
    subject: 'Problema no acesso ao painel',
    preview: 'Olá, estou tendo dificuldades para acessar o painel administrativo desde ontem...',
    body: '<p>Olá,</p><p>Estou tendo dificuldades para acessar o painel administrativo desde ontem. O sistema retorna um erro 403 ao tentar fazer login. Já tentei limpar o cache e usar outro navegador.</p><p>Podem verificar?</p><p>Obrigada,<br/>Mariana Oliveira</p>',
    date: '2026-03-22T08:45:00', is_read: true, folder: 'inbox',
  },
  {
    id: 'e-4', account_id: 'acc-1', account_name: 'Pessoal',
    from: 'Pedro Henrique', from_email: 'pedro.h@protonmail.com',
    to: ['lucas.martins@gmail.com'],
    subject: 'Convite: Churrasco no sábado',
    preview: 'E aí Lucas! Estou organizando um churrasco no sábado lá em casa, a partir das 12h...',
    body: '<p>E aí Lucas!</p><p>Estou organizando um churrasco no sábado lá em casa, a partir das 12h. Vai ter bastante gente boa, música ao vivo e muita carne. Traz uma bebida se puder!</p><p>Confirma presença?</p><p>Valeu,<br/>Pedro</p>',
    date: '2026-03-21T18:00:00', is_read: true, folder: 'inbox',
  },
  {
    id: 'e-5', account_id: 'acc-2', account_name: 'Comercial',
    from: 'Fernanda Lima', from_email: 'fernanda.lima@fornecedor.com',
    to: ['lucas@minhaempresa.com.br'],
    subject: 'Nota fiscal enviada — Pedido #4582',
    preview: 'Olá Lucas, informamos que a nota fiscal referente ao pedido #4582 foi emitida...',
    body: '<p>Olá Lucas,</p><p>Informamos que a nota fiscal referente ao pedido #4582 foi emitida e está disponível para download. O prazo de entrega é de 5 dias úteis.</p><p>Qualquer dúvida, estamos à disposição.</p><p>Atenciosamente,<br/>Fernanda Lima<br/>Departamento Financeiro</p>',
    date: '2026-03-21T14:30:00', is_read: true, folder: 'inbox', has_attachments: true,
  },
  {
    id: 'e-6', account_id: 'acc-1', account_name: 'Pessoal',
    from: 'GitHub', from_email: 'noreply@github.com',
    to: ['lucas.martins@gmail.com'],
    subject: '[repo/mail-hub] Pull request #47 merged',
    preview: 'The pull request #47 "feat: add email aggregation" has been merged into main...',
    body: '<p>The pull request <strong>#47</strong> "feat: add email aggregation" has been merged into <code>main</code> by @lucasmartins.</p><p>View the pull request on GitHub.</p>',
    date: '2026-03-21T11:20:00', is_read: true, folder: 'inbox',
  },
  {
    id: 'e-7', account_id: 'acc-2', account_name: 'Comercial',
    from: 'Lucas Martins', from_email: 'lucas@minhaempresa.com.br',
    to: ['rafael.souza@clienteabc.com'],
    subject: 'Re: Proposta comercial — Projeto Alpha',
    preview: 'Rafael, recebi a proposta e estou analisando. Retorno com feedback até sexta...',
    body: '<p>Rafael,</p><p>Recebi a proposta e estou analisando internamente. Retorno com feedback detalhado até sexta-feira.</p><p>Obrigado,<br/>Lucas Martins</p>',
    date: '2026-03-22T11:00:00', is_read: true, folder: 'sent',
  },
  {
    id: 'e-8', account_id: 'acc-3', account_name: 'Suporte',
    from: 'Lucas Martins', from_email: 'suporte@minhaempresa.com.br',
    to: ['mariana@clientexyz.com'],
    subject: 'Re: Problema no acesso ao painel',
    preview: 'Mariana, identificamos o problema e já foi corrigido. Tente acessar novamente...',
    body: '<p>Mariana,</p><p>Identificamos o problema no seu acesso. Havia uma regra de firewall bloqueando seu IP. Já foi corrigido — tente acessar novamente.</p><p>Se persistir, entre em contato.</p><p>Atenciosamente,<br/>Equipe de Suporte</p>',
    date: '2026-03-22T09:30:00', is_read: true, folder: 'sent',
  },
  {
    id: 'e-9', account_id: 'acc-1', account_name: 'Pessoal',
    from: 'Newsletter TechBR', from_email: 'news@techbr.com.br',
    to: ['lucas.martins@gmail.com'],
    subject: 'As tendências de IA para 2026',
    preview: 'Confira as principais tendências de inteligência artificial que vão dominar 2026...',
    body: '<p>Olá Lucas,</p><p>Confira as principais tendências de inteligência artificial que vão dominar 2026. Nesta edição, falamos sobre agentes autônomos, modelos multimodais e o futuro do desenvolvimento de software.</p>',
    date: '2026-03-20T08:00:00', is_read: true, folder: 'trash',
  },
  {
    id: 'e-10', account_id: 'acc-1', account_name: 'Pessoal',
    from: 'Juliana Andrade', from_email: 'juliana.andrade@empresa.com',
    to: ['lucas.martins@gmail.com'],
    subject: 'Materiais da apresentação de ontem',
    preview: 'Lucas, seguem os materiais que utilizamos na apresentação de ontem. O PDF...',
    body: '<p>Lucas,</p><p>Seguem os materiais que utilizamos na apresentação de ontem. O PDF com os slides e a planilha de métricas estão em anexo.</p><p>Abraço,<br/>Juliana</p>',
    date: '2026-03-21T16:45:00', is_read: false, folder: 'inbox', has_attachments: true,
  },
  {
    id: 'e-11', account_id: 'acc-2', account_name: 'Comercial',
    from: 'Thiago Reis', from_email: 'thiago@parceiro.co',
    to: ['lucas@minhaempresa.com.br'],
    cc: ['equipe@minhaempresa.com.br'],
    subject: 'Parceria estratégica — próximos passos',
    preview: 'Lucas, conforme alinhado, gostaria de agendar uma call para definir os...',
    body: '<p>Lucas,</p><p>Conforme alinhado na semana passada, gostaria de agendar uma call para definir os próximos passos da nossa parceria estratégica. Tenho disponibilidade na quarta ou quinta.</p><p>O que acha?</p><p>Abs,<br/>Thiago Reis</p>',
    date: '2026-03-22T07:30:00', is_read: false, folder: 'inbox',
  },
];
