/**
 * Motor de relatorios do padrao Consultas PRO.
 *
 * Este e o gerador da identidade visual da CASA — logo, cores, cabecalho,
 * divisor de marca, rodape e agrupamento por assunto de negocio. Ele nao
 * pertence a nenhum provedor.
 *
 * A implementacao nasceu no trabalho da Sollos e por isso ainda mora em
 * `sollos-template-builder.service.ts`, junto dos testes que protegem os 30
 * relatorios ja publicados. Este modulo e a porta de entrada neutra: qualquer
 * provedor novo (Brasil Cred, EHM, iConsulte, KSI) importa daqui e nao precisa
 * conhecer o nome do provedor que originou o motor.
 *
 * A matriz visual protegida continua sendo o produto 1079, lido apenas como
 * referencia de marca — nunca sobrescrito.
 */
export {
  buildSollosReportTemplate as buildConsultasProReportTemplate,
  validateSollosReportTemplate as validateConsultasProReportTemplate,
  mergeReportFieldConfigs,
  type SollosBrandReference as ConsultasProBrandReference,
  type SollosReportField as ConsultasProReportField,
  type SollosReportFieldType as ConsultasProReportFieldType,
  type SollosReportFieldConfig as ConsultasProReportFieldConfig,
  type SollosSamplingEvidence as ConsultasProSamplingEvidence,
  type SollosTemplateAudit as ConsultasProTemplateAudit,
} from './sollos-template-builder.service';
