/** Tipos da UI de integrações (alinhados ao antigo providerStore). */

export interface ConsultationFieldType {
  id: string;
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  typeItemFilters?: MappingItemFilter[];
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
  cost: number;
  fieldMappings: FieldMapping[];
  /** Critérios por chave do tipo canônico; persistidos em ProviderProduct.typeItemFilters. */
  typeItemFilters?: Record<string, MappingItemFilter[]>;
  sampleRequest?: string;
  sampleResponse?: string;
  /** JSON do corpo da requisição (mapeado para bodyTemplate na API) */
  bodyTemplateJson?: string;
  lastTestedAt?: string;
  status: 'active' | 'inactive';
  /** IDs de mapeamento persistidos (API) */
  mappingIds?: Record<string, string>;
}

export interface TestLogEntry {
  id: string;
  consultationName: string;
  providerId: string;
  endpoint: string;
  responseJson: string;
  testedAt: string;
}
