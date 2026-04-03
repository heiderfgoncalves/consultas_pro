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
  role: 'operator' | 'viewer';
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
  { id: '1', date: '2026-03-30 14:32', document: '***456789**', documentType: 'cpf', templateName: 'Análise Completa', totalPrice: 45.20, status: 'completed', blocks: mockTemplates[0].blocks, jsonLog: sampleJsonLog },
  { id: '2', date: '2026-03-29 09:15', document: '***345678**', documentType: 'cpf', templateName: 'Consulta Rápida', totalPrice: 18.20, status: 'completed', blocks: mockTemplates[1].blocks, reportedBy: 'Ana Souza', reportComment: 'Score parece inconsistente com os dados apresentados', reportStatus: 'pending', jsonLog: sampleJsonLog },
  { id: '3', date: '2026-03-28 16:44', document: '**345678/0001-**', documentType: 'cnpj', templateName: 'Premium + Bacen', totalPrice: 82.50, status: 'processing', blocks: mockTemplates[2].blocks, jsonLog: sampleJsonLog },
  { id: '4', date: '2026-03-27 11:20', document: '***789012**', documentType: 'cpf', templateName: 'Consulta Rápida', totalPrice: 18.20, status: 'completed', blocks: mockTemplates[1].blocks, reportedBy: 'Pedro Lima', reportComment: 'Dados do SPC não bateram com consulta manual', reportStatus: 'reviewed', jsonLog: sampleJsonLog },
  { id: '5', date: '2026-03-26 08:05', document: '***234567**', documentType: 'cpf', templateName: 'Análise Completa', totalPrice: 45.20, status: 'error', blocks: mockTemplates[0].blocks, jsonLog: sampleJsonLog },
];

export const mockFinancialEntries: FinancialEntry[] = [
  { id: '1', date: '2026-03-30 14:32', type: 'debit', description: 'Consulta #1 — Análise Completa', amount: -45.20, balanceAfter: 1247.50, user: 'Carlos Eduardo' },
  { id: '2', date: '2026-03-29 09:15', type: 'debit', description: 'Consulta #2 — Consulta Rápida', amount: -18.20, balanceAfter: 1292.70, user: 'Ana Souza' },
  { id: '3', date: '2026-03-28 10:00', type: 'credit', description: 'Recarga via PIX', amount: 500.00, balanceAfter: 1310.90 },
  { id: '4', date: '2026-03-27 11:20', type: 'debit', description: 'Consulta #4 — Consulta Rápida', amount: -18.20, balanceAfter: 810.90, user: 'Carlos Eduardo' },
  { id: '5', date: '2026-03-25 16:00', type: 'credit', description: 'Recarga via Cartão de Crédito', amount: 300.00, balanceAfter: 829.10 },
  { id: '6', date: '2026-03-20 09:00', type: 'bonus', description: 'Bônus de boas-vindas', amount: 50.00, balanceAfter: 529.10 },
];

export const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Ana Souza', email: 'ana@empresa.com.br', phone: '(11) 98888-7777', status: 'active', role: 'operator', lastActivity: '2026-03-30', consultationsThisMonth: 12, spentThisMonth: 156.40 },
  { id: '2', name: 'Pedro Lima', email: 'pedro@empresa.com.br', phone: '(11) 97777-6666', status: 'active', role: 'operator', lastActivity: '2026-03-29', consultationsThisMonth: 8, spentThisMonth: 98.20 },
  { id: '3', name: 'Maria Santos', email: 'maria@empresa.com.br', phone: '(11) 96666-5555', status: 'inactive', role: 'viewer', lastActivity: '2026-03-15', consultationsThisMonth: 0, spentThisMonth: 0 },
  { id: '4', name: 'João Oliveira', email: 'joao@empresa.com.br', phone: '(11) 95555-4444', status: 'pending', role: 'operator', lastActivity: '', consultationsThisMonth: 0, spentThisMonth: 0 },
];
