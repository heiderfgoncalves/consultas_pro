import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { AppError, NotFoundError } from '../../core/errors';

type SollosSampleValidationEvidence = {
  valid: boolean;
  uncoveredLeafPaths: string[];
  invalidFieldPaths: string[];
  invalidOccurrencePaths: string[];
  errors: string[];
};

export type SollosFactoryDraftInput = {
  providerId: string;
  externalId: string;
  productName: string;
  officialSampleCount: number;
  attemptedSamples: number;
  successfulSamples: number;
  failedSamples: number;
  validSamples: number;
  invalidSamples: number;
  uniquePathCount: number;
  totalLeafPathCount: number;
  coveredLeafPathCount: number;
  representativeResponse: unknown;
  fieldTypes: unknown[];
  fieldMappings: unknown[];
  typeItemFilters: Record<string, unknown>;
  suggestions: unknown[];
  structuralPaths: string[];
  sampleValidations: SollosSampleValidationEvidence[];
};

function isSollosProvider(provider: { name: string; slug: string }) {
  return (
    provider.slug.toLowerCase() === 'sollos' ||
    provider.name.toLowerCase().includes('sollos')
  );
}

function assertEvidenceConsistency(input: SollosFactoryDraftInput) {
  if (
    input.attemptedSamples !==
    input.successfulSamples + input.failedSamples
  ) {
    throw new AppError(
      400,
      'INVALID_SAMPLING_TOTAL',
      'O total de amostras não corresponde aos sucessos e falhas.',
    );
  }
  if (input.validSamples + input.invalidSamples !== input.attemptedSamples) {
    throw new AppError(
      400,
      'INVALID_VALIDATION_TOTAL',
      'O total validado não corresponde às amostras executadas.',
    );
  }
  if (input.sampleValidations.length !== input.attemptedSamples) {
    throw new AppError(
      400,
      'SAMPLE_VALIDATION_EVIDENCE_REQUIRED',
      'Cada amostra precisa possuir sua própria evidência de validação.',
    );
  }
  const validEvidenceCount = input.sampleValidations.filter(
    (sample) => sample.valid,
  ).length;
  const inconsistentValidEvidence = input.sampleValidations.some(
    (sample) =>
      sample.valid &&
      (sample.errors.length > 0 ||
        sample.uncoveredLeafPaths.length > 0 ||
        sample.invalidFieldPaths.length > 0 ||
        sample.invalidOccurrencePaths.length > 0),
  );
  if (
    validEvidenceCount !== input.validSamples ||
    input.sampleValidations.length - validEvidenceCount !==
      input.invalidSamples ||
    inconsistentValidEvidence
  ) {
    throw new AppError(
      400,
      'INVALID_SAMPLE_EVIDENCE',
      'As evidências individuais não correspondem ao resultado consolidado.',
    );
  }
  if (
    new Set(input.structuralPaths).size !== input.uniquePathCount ||
    input.coveredLeafPathCount > input.totalLeafPathCount
  ) {
    throw new AppError(
      400,
      'INVALID_PATH_COVERAGE',
      'A cobertura estrutural informada é inconsistente.',
    );
  }
}

export async function getSollosFactoryDraft(
  app: FastifyInstance,
  providerId: string,
  externalId: string,
) {
  return app.prisma.sollosFactoryDraft.findUnique({
    where: {
      providerId_externalId: {
        providerId,
        externalId,
      },
    },
  });
}

export async function upsertSollosFactoryDraft(
  app: FastifyInstance,
  input: SollosFactoryDraftInput,
) {
  const provider = await app.prisma.provider.findUnique({
    where: { id: input.providerId },
    select: { id: true, name: true, slug: true },
  });
  if (!provider) throw new NotFoundError('Provedor Sollos não encontrado');
  if (!isSollosProvider(provider)) {
    throw new AppError(
      400,
      'SOLLOS_PROVIDER_REQUIRED',
      'A Fábrica aceita rascunhos automáticos somente do provedor Sollos.',
    );
  }

  assertEvidenceConsistency(input);
  const status =
    input.attemptedSamples > 0 &&
    input.failedSamples === 0 &&
    input.invalidSamples === 0 &&
    input.successfulSamples === input.attemptedSamples &&
    input.coveredLeafPathCount === input.totalLeafPathCount
      ? 'READY_FOR_MANUAL_REVIEW'
      : 'NEEDS_ADJUSTMENT';
  const json = (value: unknown) => value as Prisma.InputJsonValue;
  const data = {
    productName: input.productName,
    status,
    officialSampleCount: input.officialSampleCount,
    attemptedSamples: input.attemptedSamples,
    successfulSamples: input.successfulSamples,
    failedSamples: input.failedSamples,
    validSamples: input.validSamples,
    invalidSamples: input.invalidSamples,
    uniquePathCount: input.uniquePathCount,
    totalLeafPathCount: input.totalLeafPathCount,
    coveredLeafPathCount: input.coveredLeafPathCount,
    representativeResponse: json(input.representativeResponse),
    fieldTypes: json(input.fieldTypes),
    fieldMappings: json(input.fieldMappings),
    typeItemFilters: json(input.typeItemFilters),
    suggestions: json(input.suggestions),
    structuralPaths: json(input.structuralPaths),
    sampleValidations: json(input.sampleValidations),
  };

  return app.prisma.sollosFactoryDraft.upsert({
    where: {
      providerId_externalId: {
        providerId: input.providerId,
        externalId: input.externalId,
      },
    },
    create: {
      providerId: input.providerId,
      externalId: input.externalId,
      ...data,
    },
    update: {
      ...data,
      version: { increment: 1 },
    },
  });
}
