/* @vitest-environment jsdom */
import "@/test/setup";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProviderConsultation } from '@/types/integrations';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';

const consultations = [
  {
    id: 'c1',
    providerId: 'p1',
    name: 'Consulta 1',
    code: 'C1',
    endpoint: '/c1',
    method: 'POST',
    cost: 0,
    consultationPrice: 0,
    status: 'active',
    fieldMappings: [],
    sampleRequest: '{}',
    sampleResponse: '{}',
    externalId: null,
    integrationOverrides: null,
    typeItemFilters: {},
    bodyTemplate: null,
    queryTemplate: null,
    headersTemplate: null,
    sessionAssignments: [],
  },
] as unknown as ProviderConsultation[];

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TemplateBuilderEditor modes', () => {
  it('modo usuário não exibe blocos técnicos de admin', () => {
    renderWithQuery(
      <TemplateBuilderEditor
        mode="embedded"
        builderMode="user"
        availableConsultationBlocks={consultations}
        fieldTypes={[]}
      />,
    );

    expect(screen.queryByText('Variáveis dinâmicas')).not.toBeInTheDocument();
    expect(screen.queryByText('Console de Expressões')).not.toBeInTheDocument();
    expect(screen.queryByText('Esqueleto')).not.toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('modo admin exibe controles técnicos', () => {
    renderWithQuery(
      <TemplateBuilderEditor
        mode="embedded"
        builderMode="admin"
        availableConsultationBlocks={consultations}
        fieldTypes={[]}
      />,
    );

    expect(screen.getByText('Esqueleto')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Console de Expressões')).toBeInTheDocument();
  });
});
