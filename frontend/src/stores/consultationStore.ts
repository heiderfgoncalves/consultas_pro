import { create } from 'zustand';

export interface ConsultationBlock {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  blocks: ConsultationBlock[];
  totalPrice: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationHistory {
  id: string;
  date: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
  templateName: string;
  totalPrice: number;
  status: 'completed' | 'processing' | 'error';
  blocks: ConsultationBlock[];
  reportedBy?: string;
  reportComment?: string;
  reportStatus?: 'pending' | 'reviewed' | 'resolved';
  jsonLog?: string;
  externalUserId?: string;
}

export interface FinancialEntry {
  id: string;
  date: string;
  type: 'credit' | 'debit' | 'adjustment' | 'bonus';
  description: string;
  amount: number;
  balanceAfter: number;
  user?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'admin' | 'analyst' | 'viewer' | 'operator' | string;
  lastActivity: string;
  consultationsThisMonth: number;
  spentThisMonth: number;
}

interface ConsultationState {
  selectedBlocks: ConsultationBlock[];
  addBlock: (block: ConsultationBlock) => void;
  removeBlock: (blockId: string) => void;
  clearBlocks: () => void;
  reorderBlocks: (blocks: ConsultationBlock[]) => void;
  totalPrice: () => number;
}

export const useConsultationStore = create<ConsultationState>((set, get) => ({
  selectedBlocks: [],
  addBlock: (block) => set((state) => ({ selectedBlocks: [...state.selectedBlocks, block] })),
  removeBlock: (blockId) => set((state) => ({ selectedBlocks: state.selectedBlocks.filter(b => b.id !== blockId) })),
  clearBlocks: () => set({ selectedBlocks: [] }),
  reorderBlocks: (blocks) => set({ selectedBlocks: blocks }),
  totalPrice: () => get().selectedBlocks.reduce((sum, b) => sum + b.price, 0),
}));

export const availableBlocks: ConsultationBlock[] = [
  { id: '1', name: 'SPC', description: 'Consulta débitos e pendências no SPC Brasil', price: 4.50, category: 'Restrições', icon: 'AlertTriangle' },
  { id: '2', name: 'Serasa', description: 'Consulta negativações e pendências Serasa', price: 5.20, category: 'Restrições', icon: 'AlertTriangle' },
  { id: '3', name: 'Boa Vista SCPC', description: 'Consulta apontamentos Boa Vista', price: 3.80, category: 'Restrições', icon: 'AlertTriangle' },
  { id: '4', name: 'Protestos', description: 'Consulta protestos em cartórios', price: 6.00, category: 'Restrições', icon: 'FileWarning' },
  { id: '5', name: 'Score de Crédito', description: 'Pontuação de risco de crédito 0-1000', price: 8.50, category: 'Score & Rating', icon: 'Gauge' },
  { id: '6', name: 'Rating de Crédito', description: 'Classificação por letras (AAA a D)', price: 7.00, category: 'Score & Rating', icon: 'Award' },
  { id: '7', name: 'Renda Presumida', description: 'Estimativa de renda com base em dados de mercado', price: 12.00, category: 'Análise', icon: 'DollarSign' },
  { id: '8', name: 'Capacidade de Pagamento', description: 'Análise de capacidade de pagamento mensal', price: 10.00, category: 'Análise', icon: 'TrendingUp' },
  { id: '9', name: 'Risco de Crédito', description: 'Análise de probabilidade de inadimplência', price: 9.50, category: 'Análise', icon: 'ShieldAlert' },
  { id: '10', name: 'Registrato Bacen', description: 'Dados do sistema do Banco Central', price: 15.00, category: 'Bacen', icon: 'Building2' },
  { id: '11', name: 'Cheques Devolvidos', description: 'Consulta cheques sem fundo', price: 3.50, category: 'Restrições', icon: 'FileX' },
  { id: '12', name: 'Participação Societária', description: 'Empresas vinculadas ao CPF/CNPJ', price: 6.50, category: 'Cadastral', icon: 'Users' },
];

export const mockTemplates: SavedTemplate[] = [
  {
    id: '1', name: 'Análise Completa', isFavorite: true,
    blocks: [availableBlocks[0], availableBlocks[1], availableBlocks[4], availableBlocks[6], availableBlocks[9]],
    totalPrice: 45.20, createdAt: '2026-03-15', updatedAt: '2026-03-28',
  },
  {
    id: '2', name: 'Consulta Rápida', isFavorite: false,
    blocks: [availableBlocks[0], availableBlocks[1], availableBlocks[4]],
    totalPrice: 18.20, createdAt: '2026-03-20', updatedAt: '2026-03-20',
  },
  {
    id: '3', name: 'Premium + Bacen', isFavorite: true,
    blocks: [availableBlocks[0], availableBlocks[1], availableBlocks[2], availableBlocks[3], availableBlocks[4], availableBlocks[5], availableBlocks[6], availableBlocks[7], availableBlocks[8], availableBlocks[9]],
    totalPrice: 82.50, createdAt: '2026-03-10', updatedAt: '2026-03-25',
  },
];

const sampleJsonLog = JSON.stringify({
  request: { document: "214.193.318-84", blocks: ["spc", "serasa", "score"], timestamp: "2026-03-30T14:32:00Z" },
  response: { status: "completed", processingTime: "2.3s", results: { spc: { records: 4, total: 810.16 }, serasa: { records: 3, total: 7234.23 }, score: { value: 24, band: "pessimo" } } },
  metadata: { userId: "1", ip: "192.168.1.100", userAgent: "Mozilla/5.0" }
}, null, 2);

export const mockHistory: ConsultationHistory[] = [
  { id: '1', date: '2026-05-31 14:32', document: '123.456.789-00', documentType: 'cpf', templateName: 'CPF - Cadastro de Pessoas Físicas', totalPrice: 45.20, status: 'completed', blocks: mockTemplates[0].blocks, jsonLog: sampleJsonLog, externalUserId: 'cliente_rprotec_123' },
  { id: '2', date: '2026-05-31 14:28', document: '12.345.678/0001-90', documentType: 'cnpj', templateName: 'CNPJ - Cadastro Nacional de Pessoa Jurídica', totalPrice: 82.50, status: 'completed', blocks: mockTemplates[2].blocks, jsonLog: sampleJsonLog, externalUserId: 'api_rprotec_prod' },
  { id: '3', date: '2026-05-31 14:25', document: 'ABC-1023', documentType: 'cpf', templateName: 'Placa - Consulta Veicular', totalPrice: 15.00, status: 'processing', blocks: [availableBlocks[3]], jsonLog: sampleJsonLog, externalUserId: 'felipe_rodriguez' },
  { id: '4', date: '2026-05-30 11:20', document: '***789012**', documentType: 'cpf', templateName: 'Consulta Rápida', totalPrice: 18.20, status: 'completed', blocks: mockTemplates[1].blocks, reportedBy: 'Pedro Lima', reportComment: 'Dados do SPC não bateram com consulta manual', reportStatus: 'reviewed', jsonLog: sampleJsonLog, externalUserId: 'ana_silva' },
  { id: '5', date: '2026-05-29 08:05', document: '***234567**', documentType: 'cpf', templateName: 'Análise Completa', totalPrice: 45.20, status: 'error', blocks: mockTemplates[0].blocks, jsonLog: sampleJsonLog },
];

export const mockFinancialEntries: FinancialEntry[] = [
  { id: '1', date: '24/05/2025 14:32', type: 'credit', description: 'Compra de créditos 10.000', amount: 5000.00, balanceAfter: 8350.75, user: 'Ana Paula Silva' },
  { id: '2', date: '24/05/2025 11:07', type: 'debit', description: 'Consumo de consultas', amount: -1250.30, balanceAfter: 3350.75, user: 'Carlos Mendes' },
  { id: '3', date: '23/05/2025 16:45', type: 'credit', description: 'Compra de créditos 5.000', amount: 2500.00, balanceAfter: 4601.05, user: 'Mariana Souza' },
  { id: '4', date: '22/05/2025 09:12', type: 'debit', description: 'Consumo de consultas', amount: -980.40, balanceAfter: 2101.05, user: 'Carlos Mendes' },
  { id: '5', date: '21/05/2025 10:33', type: 'adjustment', description: 'Ajuste de créditos', amount: 400.00, balanceAfter: 3081.45, user: 'Juliana Costa' },
];

export const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Ana Paula Silva', email: 'ana.paula@elitesolucoes.com.br', phone: '(11) 98888-7777', status: 'active', role: 'Administradora', lastActivity: 'Hoje, 14:32', consultationsThisMonth: 120, spentThisMonth: 1560.40 },
  { id: '2', name: 'Carlos Mendes', email: 'carlos.mendes@elitesolucoes.com.br', phone: '(11) 97777-6666', status: 'active', role: 'Analista', lastActivity: 'Hoje, 11:07', consultationsThisMonth: 84, spentThisMonth: 980.20 },
  { id: '3', name: 'Mariana Souza', email: 'mariana.souza@elitesolucoes.com.br', phone: '(11) 96666-5555', status: 'active', role: 'Analista', lastActivity: 'Ontem, 16:45', consultationsThisMonth: 50, spentThisMonth: 520.10 },
  { id: '4', name: 'Felipe Rodrigues', email: 'felipe.rodrigues@elitesolucoes.com.br', phone: '(11) 95555-4444', status: 'active', role: 'Visualizador', lastActivity: 'Ontem, 09:22', consultationsThisMonth: 10, spentThisMonth: 120.00 },
  { id: '5', name: 'Juliana Costa', email: 'juliana.costa@elitesolucoes.com.br', phone: '(11) 94444-3333', status: 'inactive', role: 'Analista', lastActivity: '23/05/2025', consultationsThisMonth: 0, spentThisMonth: 0 },
];
