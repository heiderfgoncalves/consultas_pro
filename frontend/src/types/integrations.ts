/** Tipos da UI de integrações (alinhados ao antigo providerStore). */

export type ReportFieldDataType =
  | 'text'
  | 'boolean'
  | 'numeric'
  | 'date'
  | 'datetime'
  | 'currency'
  | 'percent'
  | 'document';

export type ReportFieldColorTarget = 'value' | 'row';

export type ReportFieldConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'empty'
  | 'notEmpty';

export interface ReportFieldConditionalRule {
  id: string;
  operator: ReportFieldConditionOperator;
  value?: string;
  color: string;
  colorTarget: ReportFieldColorTarget;
}

export interface TypeReportFieldDefinition {
  id: string;
  /** Chave de referência (slug do rótulo): minúsculas, sem acento, espaços como `_`. */
  key: string;
  label: string;
  sortOrder: number;
  dataType: ReportFieldDataType;
  conditionalRules: ReportFieldConditionalRule[];
}

export interface TypeReportFieldConfig {
  version: 1;
  fields: TypeReportFieldDefinition[];
}

export interface ConsultationFieldType {
  id: string;
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  typeItemFilters?: MappingItemFilter[];
  reportFieldConfig?: TypeReportFieldConfig;
}

export interface FieldMapping {
  jsonPath: string;
  fieldTypeKey: string;
  label: string;
  format?: string;
  uiStartLine?: number;
  uiEndLine?: number;
}

export type MappingItemFilterOp = 'eq' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
export interface MappingItemFilter {
  field: string;
  op: MappingItemFilterOp;
  value: string;
}

export interface TypeItemFieldMapping {
  id: string;
  reportFieldId: string;
  reportFieldLabel: string;
  jsonPath: string;
}

export interface TypeItemFilterRule extends MappingItemFilter {
  id: string;
}

export interface TypeItemFilterGroup {
  id: string;
  joinOperator: 'and' | 'or';
  rules: TypeItemFilterRule[];
}

export interface TypeItemFilterConfig {
  version: 2;
  groups: TypeItemFilterGroup[];
  fieldMappings: TypeItemFieldMapping[];
  dedupFieldIds: string[];
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  balanceEndpoint: string;
  rechargeEndpoint: string;
  authType: 'bearer' | 'basic' | 'apikey' | 'custom';
  credentials: { key: string; value: string }[];
  status: 'active' | 'inactive';
  createdAt: string;
  /** IDs das operações saldo/recarga quando vindas da API */
  balanceOperationId?: string;
  rechargeOperationId?: string;
}

export interface ProviderConsultation {
  id: string;
  providerId: string;
  name: string;
  externalId: string;
  endpoint: string;
  method: 'GET' | 'POST';
  /** Tarifa admin → provedor */
  cost: number;
  /** Valor debitado do cliente (carteira) nesta consulta */
  consultationPrice: number;
  fieldMappings: FieldMapping[];
  /** Critérios avançados e mapeamento de campos por chave do tipo canônico; persistidos em ProviderProduct.typeItemFilters. */
  typeItemFilters?: Record<string, TypeItemFilterConfig>;
  sampleRequest?: string;
  sampleResponse?: string;
  /** JSON do corpo da requisição (mapeado para bodyTemplate na API) */
  bodyTemplateJson?: string;
  lastTestedAt?: string;
  updatedAt: string;
  status: 'active' | 'inactive';
  /** IDs de mapeamento persistidos (API) */
  mappingIds?: Record<string, string>;
}

export interface TestLogEntry {
  id: string;
  /** Produto/consulta salvo; null em testes draft ou logs antigos */
  productId: string | null;
  consultationName: string;
  providerId: string;
  endpoint: string;
  responseJson: string;
  testedAt: string;
}
