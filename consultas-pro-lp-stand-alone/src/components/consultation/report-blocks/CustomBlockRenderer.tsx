import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';

interface CustomBlockRendererProps {
  template: string;
  mode: 'skeleton' | 'preview';
  context?: ExpressionContext;
}

export default function CustomBlockRenderer({ template, mode, context }: CustomBlockRendererProps) {
  const ctx = context ?? MOCK_EXPRESSION_CONTEXT;
  const html = useMemo(() => {
    try {
      const raw = mode === 'preview' ? evaluateExpression(template, ctx) : template;
      return DOMPurify.sanitize(raw);
    } catch {
      return '<p class="text-destructive text-xs">Erro ao renderizar bloco customizado</p>';
    }
  }, [template, mode, ctx]);

  return <div className="custom-block-rendered text-xs" dangerouslySetInnerHTML={{ __html: html }} />;
}
