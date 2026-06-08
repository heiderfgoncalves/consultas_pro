/* @vitest-environment jsdom */
import "@/test/setup";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TemplateRenderer from '@/components/consultation/TemplateRenderer';
import { sectionsToTemplateDocument } from '@/lib/templateDocument';
import { createField, createSection } from '@/lib/templateSectionUtils';

const capabilitiesAdmin = {
  showSkeleton: true,
  showPreview: true,
  showXml: true,
  showVariables: true,
  showConsole: true,
  canEditAdvanced: true,
};

describe('TemplateRenderer', () => {
  it('renderiza preview rico usando blocos do metadata.selectedBlockIds quando blocks está vazio', () => {
    const document = sectionsToTemplateDocument({
      name: 'Template Preview',
      sections: [
        createSection('Header', [createField('Empresa', '{$template.company}')], { kind: 'header' }),
        createSection('Score', [createField('Score', '{$SCORE.valor}')], { kind: 'score' }),
      ],
      logo: null,
      selectedBlockIds: ['5'],
    });

    render(
      <TemplateRenderer
        document={document}
        mode="preview"
        blocks={[]}
        capabilities={capabilitiesAdmin}
        clientName="Cliente Teste"
        documentIdValue="123.456.789-00"
      />,
    );

    expect(screen.getByText('Plano de Ação — Seu Próximo Passo')).toBeInTheDocument();
    expect(screen.getByText('Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)')).toBeInTheDocument();
  });

  it('respeita capabilities e não renderiza skeleton quando showSkeleton=false', () => {
    const document = sectionsToTemplateDocument({
      name: 'Template Restrito',
      sections: [createSection('Header', [createField('Empresa', '{$template.company}')], { kind: 'header' })],
      logo: null,
      selectedBlockIds: [],
    });

    const { container } = render(
      <TemplateRenderer
        document={document}
        mode="skeleton"
        blocks={[]}
        capabilities={{ ...capabilitiesAdmin, showSkeleton: false }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
