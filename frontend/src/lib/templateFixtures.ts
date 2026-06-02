import type { TemplateDocument } from '@/types/template-document';

export const MOCK_CONSULTATION_SCORE_COMPLETO = {
  dados_pessoais: {
    nome: 'JULIANO CAMPOS PEREIRA',
    cpf: '403.406.588-51',
  },
  score: {
    valor: 750,
    faixa: 'Bom',
    chancePagar: 75.0,
    probabilidadeInadimplencia: 25.0,
  },
  dividas: [
    { credor: 'BANCO DO BRASIL', contrato: '123456', valor: 1500.0 },
    { credor: 'ITAU', contrato: '789012', valor: 450.5 },
  ],
  RESUMO_FINANCEIRO: {
    totalApontado: 1950.5,
    totalDeduzido: 1950.5,
    riscoBacenVencido: 0,
  },
};

export const MOCK_CONSULTATION_SEM_CAMPOS = {
  dados_pessoais: {
    nome: 'ANA MARIA SILVA',
    cpf: '123.456.789-00',
  },
  score: null,
  dividas: [],
  RESUMO_FINANCEIRO: {
    totalApontado: 0,
    totalDeduzido: 0,
    riscoBacenVencido: 0,
  },
};

export const MOCK_CONSULTATION_COM_DIVIDAS = {
  dados_pessoais: {
    nome: 'ROBERTO CARLOS ALVES',
    cpf: '987.654.321-11',
  },
  score: {
    valor: 150,
    faixa: 'Péssimo',
    chancePagar: 15.0,
    probabilidadeInadimplencia: 85.0,
  },
  dividas: [
    { credor: 'LOJAS RENNER', contrato: 'REN-777', valor: 320.0 },
    { credor: 'PERNAMBUCANAS', contrato: 'PER-888', valor: 180.0 },
    { credor: 'CAIXA ECONOMICA', contrato: 'CX-999', valor: 4500.0 },
  ],
  RESUMO_FINANCEIRO: {
    totalApontado: 5000.0,
    totalDeduzido: 3500.0,
    riscoBacenVencido: 1500.0,
  },
};

export const MOCK_TEMPLATE_DOCUMENT_BASE: TemplateDocument = {
  schemaVersion: 2,
  name: 'Relatório Base',
  nodes: [
    {
      id: 'section-header',
      type: 'section',
      label: 'Cabeçalho',
      kind: 'header',
      children: [
        { id: 'f-company', type: 'field', label: 'Empresa', tag: 'label', binding: { expression: '{$template.company}' } },
        { id: 'f-title', type: 'field', label: 'Título', tag: 'text', binding: { expression: 'Relatório Analítico de Crédito' }, style: { fontSize: 14 } },
        { id: 'f-date', type: 'field', label: 'Data', tag: 'value', binding: { expression: '{$template.date}' } },
        { id: 'f-protocol', type: 'field', label: 'Protocolo', tag: 'value', binding: { expression: '{$template.protocol}' } },
      ],
    },
    {
      id: 'section-client-info',
      type: 'section',
      label: 'Dados Pessoais',
      kind: 'personal-data',
      children: [
        { id: 'f-client-name', type: 'field', label: 'Cliente Analisado', tag: 'value', binding: { expression: '{$cliente.nome}' }, icon: 'User' },
        { id: 'f-client-doc', type: 'field', label: 'Documento', tag: 'value', binding: { expression: '{$cliente.documento}' }, icon: 'Hash' },
      ],
    },
  ],
};
