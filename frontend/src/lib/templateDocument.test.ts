import { describe, expect, it } from 'vitest';
import {
  migrateTemplateLayout,
  normalizeTemplateDocument,
  parseTemplateXml,
  sectionsToTemplateDocument,
  serializeSectionXml,
  serializeTemplateXml,
  templateDocumentToSections,
} from '@/lib/templateDocument';
import { createField, createSection } from '@/lib/templateSectionUtils';

describe('templateDocument', () => {
  it('normaliza documento e força schemaVersion 2', () => {
    const normalized = normalizeTemplateDocument({
      schemaVersion: 2,
      name: '',
      nodes: [
        {
          id: '',
          type: 'section',
          label: 'Header',
          kind: 'header',
          children: [
            {
              id: '',
              type: 'field',
              label: 'Empresa',
              expression: '{$template.company}',
            },
          ],
        },
      ],
    });

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.name).toBe('Template');
    expect(normalized.nodes[0]?.id).toBeTruthy();
    expect(normalized.nodes[0]?.children?.[0]?.id).toBeTruthy();
    expect(normalized.metadata?.xml).toContain('<section');
  });

  it('migra layout legado schemaVersion 1 para documento canônico', () => {
    const legacy = {
      schemaVersion: 1,
      sections: [
        createSection('Dados Pessoais', [
          createField('Cliente', '{$cliente.nome}'),
        ], { kind: 'data' }),
      ],
    };

    const migrated = migrateTemplateLayout(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.nodes.length).toBe(1);
    expect(migrated?.nodes[0]?.type).toBe('section');
  });

  it('faz round-trip XML -> documento -> XML preservando seção e campo', () => {
    const xml = `
<section name="Header" kind="header">
  <field label="Empresa" tag="label">{$template.company}</field>
  <field label="Data" tag="value">{$template.date}</field>
</section>
`.trim();

    const document = parseTemplateXml(xml, 'Template Teste');
    const serialized = serializeTemplateXml(document);
    const sections = templateDocumentToSections(document);

    expect(document.schemaVersion).toBe(2);
    expect(document.name).toBe('Template Teste');
    expect(sections[0]?.title).toBe('Header');
    expect(sections[0]?.fields.length).toBe(2);
    expect(serialized).toContain('<section');
    expect(serialized).toContain('label="Empresa"');
    expect(serialized).toContain('{$template.company}');
  });

  it('suporta parse/serialize de nodes avançados (table/container/speedometer/kpi)', () => {
    const xml = `
<section id="score" name="Score" kind="score">
  <speedometer id="spd_1" label="Velocímetro" value="{$SCORE.valor}" />
  <kpi id="kpi_1" label="Chance de pagar">{$SCORE.chancePagar}</kpi>
  <table id="tbl_1" label="Tabela de Dívidas" source="dividas">
    <column id="col_1" label="Credor">{$divida.credor}</column>
    <column id="col_2" label="Valor">{$divida.valor}</column>
  </table>
  <container id="cont_1" label="Bloco auxiliar">
    <text id="txt_1" label="Observação">Texto livre</text>
  </container>
</section>
`.trim();

    const document = parseTemplateXml(xml, 'Template Avançado');
    const serialized = serializeTemplateXml(document);

    expect(document.nodes[0]?.type).toBe('section');
    const section = document.nodes[0] as { children?: Array<{ type: string }> };
    expect(section.children?.some((node) => node.type === 'speedometer')).toBe(true);
    expect(section.children?.some((node) => node.type === 'kpi')).toBe(true);
    expect(section.children?.some((node) => node.type === 'table')).toBe(true);
    expect(section.children?.some((node) => node.type === 'container')).toBe(true);

    expect(serialized).toContain('<speedometer');
    expect(serialized).toContain('<kpi');
    expect(serialized).toContain('<table');
    expect(serialized).toContain('<container');
  });

  it('serializa recorte XML por seção id', () => {
    const sections = [
      createSection('Header', [createField('Empresa', '{$template.company}')], { kind: 'header' }),
      createSection('Score', [createField('Score', '{$SCORE.valor}')], { kind: 'score' }),
    ];

    const document = sectionsToTemplateDocument({
      name: 'Template Recorte',
      sections,
      logo: null,
      selectedBlockIds: ['5'],
    });

    const scoreSectionId = document.nodes[1]?.id ?? '';
    const scoreXml = serializeSectionXml(document, scoreSectionId);

    expect(scoreXml).toContain('<section');
    expect(scoreXml).toContain('Score');
    expect(scoreXml).toContain('{$SCORE.valor}');
    expect(scoreXml).not.toContain('Empresa');
  });

  it('converte sections para documento com metadata padrão', () => {
    const sections = [
      createSection('Score', [
        createField('Score', '{$SCORE.valor}'),
      ], { kind: 'score' }),
    ];

    const document = sectionsToTemplateDocument({
      name: 'Template Score',
      sections,
      logo: null,
      selectedBlockIds: ['score-block'],
    });

    expect(document.schemaVersion).toBe(2);
    expect(document.metadata?.selectedBlockIds).toEqual(['score-block']);
    expect(document.metadata?.xml).toContain('<section');
  });
});
