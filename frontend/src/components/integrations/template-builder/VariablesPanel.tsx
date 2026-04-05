import { useMemo, useState } from 'react';
import { Braces, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ConsultationFieldType } from '@/types/integrations';
import type { TemplateBuilderCapabilities } from '@/types/template-layout';
import { SYSTEM_TEMPLATE_VARIABLES, buildTypeFieldVariables } from '@/lib/templateVariableCatalog';
import { cn } from '@/lib/utils';

type VariablesPanelProps = {
  fieldTypes: ConsultationFieldType[];
  capabilities: TemplateBuilderCapabilities;
  onInsertVariable: (expression: string) => void;
};

type TypeExpansionState = Record<string, boolean>;

export function VariablesPanel({ fieldTypes, capabilities, onInsertVariable }: VariablesPanelProps) {
  const [query, setQuery] = useState('');
  const [expandedByType, setExpandedByType] = useState<TypeExpansionState>({});

  const typeFieldVars = useMemo(() => buildTypeFieldVariables(fieldTypes), [fieldTypes]);

  const filteredSystem = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYSTEM_TEMPLATE_VARIABLES;
    return SYSTEM_TEMPLATE_VARIABLES.filter((item) => item.label.toLowerCase().includes(q) || item.expression.toLowerCase().includes(q));
  }, [query]);

  const byType = useMemo(() => {
    const grouped: Record<string, typeof typeFieldVars> = {};
    for (const item of typeFieldVars) {
      if (!item.typeKey) continue;
      if (!grouped[item.typeKey]) grouped[item.typeKey] = [];
      grouped[item.typeKey]!.push(item);
    }
    return grouped;
  }, [typeFieldVars]);

  const q = query.trim().toLowerCase();

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Braces className="h-3.5 w-3.5 text-primary" />
        Variáveis dinâmicas
      </div>

      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar variável..."
          className="h-8 pl-7 text-xs"
        />
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sistêmicas</div>
        <div className="space-y-1">
          {filteredSystem.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full justify-start text-[11px] font-mono"
              onClick={() => onInsertVariable(item.expression)}
            >
              {item.expression}
            </Button>
          ))}
          {filteredSystem.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma variável sistêmica encontrada.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Tipos e campos
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {fieldTypes.map((typeItem) => {
            const typeVars = byType[typeItem.key] ?? [];
            const matchesType = !q || typeItem.label.toLowerCase().includes(q) || typeItem.key.toLowerCase().includes(q);
            const filteredTypeVars = q
              ? typeVars.filter((item) => item.label.toLowerCase().includes(q) || item.expression.toLowerCase().includes(q))
              : typeVars;

            if (!matchesType && filteredTypeVars.length === 0) return null;

            const expanded = expandedByType[typeItem.key] ?? false;

            return (
              <div key={typeItem.id} className="rounded-md border border-border">
                <button
                  type="button"
                  className="w-full h-8 px-2.5 text-left flex items-center gap-2 hover:bg-muted/40 cursor-pointer"
                  onClick={() => setExpandedByType((prev) => ({ ...prev, [typeItem.key]: !expanded }))}
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-foreground truncate">{typeItem.label}</span>
                </button>
                {expanded && (
                  <div className="px-2.5 pb-2 space-y-1">
                    {filteredTypeVars.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onInsertVariable(item.expression)}
                        className={cn(
                          'w-full rounded border border-border bg-background px-2 py-1 text-left text-[11px] font-mono text-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer',
                          !capabilities.canUseAdvancedVariables && 'opacity-50',
                        )}
                        disabled={!capabilities.canUseAdvancedVariables}
                      >
                        {item.expression}
                      </button>
                    ))}
                    {filteredTypeVars.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem campos configurados para este tipo.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
