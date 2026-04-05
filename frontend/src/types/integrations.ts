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
  /** JsonPath do trecho no retorno (como no card). Quando definido, o preview só lê esse trecho no de-para. */
  sourceTrechoPath?: string;
}

/** Agregação no trecho (soma/média/etc.) sobre valores de um campo já mapeado do tipo. */
export type TypeComputedFieldOperator = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Campo calculado persistido por consulta em `typeItemFilters` (não exige jsonPath). */
export interface TypeComputedFieldDefinition {
  id: string;
  label: string;
  /** Chave estável para o preview (slug). */
  key: string;
  dataType: ReportFieldDataType;
  operator: TypeComputedFieldOperator;
  /** `reportFieldId` de um campo do relatório do tipo (aba Tipos) usado como fonte. */
  sourceReportFieldId: string;
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
  /** Campos calculados por agregação no trecho (preview e saída). */
  computedFields?: TypeComputedFieldDefinition[];
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
  /** Overrides de mapeamento por sessão (admin templates). */
  sessionAssignments?: Record<string, ProductSessionFieldAssignment[]>;
  sampleRequest?: string;
  sampleResponse?: string;
  /** JSON do corpo da requisição (mapeado para bodyTemplate na API) */
  bodyTemplateJson?: string;
  /** Documento de layout avançado do template (page-builder). */
  templateLayout?: unknown;
  lastTestedAt?: string;
  updatedAt: string;
  status: 'active' | 'inactive';
  /** IDs de mapeamento persistidos (API) */
  mappingIds?: Record<string, string>;
}

export interface ProductSessionFieldAssignment {
  canonicalFieldId: string;
  fieldTypeKey: string;
  label: string;
  sourcePath: string;
  sortOrder: number;
  isActive: boolean;
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
