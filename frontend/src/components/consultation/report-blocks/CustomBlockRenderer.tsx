import { useMemo } from 'react';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';

interface CustomBlockRendererProps {
  template: string;
  skeleton: string;
  mode: 'skeleton' | 'preview';
  context?: ExpressionContext;
}

export default function CustomBlockRenderer({
  template,
  skeleton,
  mode,
  context,
}: CustomBlockRendererProps) {
  const ctx = context ?? MOCK_EXPRESSION_CONTEXT;
  const html = useMemo(() => {
    try {
      const source = mode === 'skeleton' ? skeleton : template;
      return evaluateExpression(source, ctx);
    } catch {
      return '<p class="text-destructive text-xs">Erro ao renderizar bloco customizado</p>';
    }
  }, [template, skeleton, mode, ctx]);

  return (
    <div
      className="custom-block-rendered text-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
