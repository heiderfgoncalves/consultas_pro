import { Blocks, Columns3, Rows3, Section, SeparatorHorizontal, Table, Type, Variable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TemplateBuilderCapabilities, TemplateWidgetKind } from '@/types/template-layout';
import type { ReactNode } from 'react';

type BuilderToolbarProps = {
  capabilities: TemplateBuilderCapabilities;
  onAddSection: () => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onAddWidget: (widgetType: TemplateWidgetKind) => void;
};

function ToolbarButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

export function BuilderToolbar({
  capabilities,
  onAddSection,
  onAddRow,
  onAddColumn,
  onAddWidget,
}: BuilderToolbarProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Blocks className="h-3.5 w-3.5 text-primary" />
        Toolbar do layout
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ToolbarButton
          label="Seção"
          icon={<Section className="h-3.5 w-3.5" />}
          onClick={onAddSection}
          disabled={!capabilities.canAddSections}
        />
        <ToolbarButton
          label="Linha"
          icon={<Rows3 className="h-3.5 w-3.5" />}
          onClick={onAddRow}
          disabled={!capabilities.canAddRows}
        />
        <ToolbarButton
          label="Coluna"
          icon={<Columns3 className="h-3.5 w-3.5" />}
          onClick={onAddColumn}
          disabled={!capabilities.canAddColumns}
        />
        <ToolbarButton
          label="Título"
          icon={<Type className="h-3.5 w-3.5" />}
          onClick={() => onAddWidget('title')}
          disabled={!capabilities.canAddWidgets}
        />
        <ToolbarButton
          label="Texto"
          icon={<Type className="h-3.5 w-3.5" />}
          onClick={() => onAddWidget('text')}
          disabled={!capabilities.canAddWidgets}
        />
        <ToolbarButton
          label="Variável"
          icon={<Variable className="h-3.5 w-3.5" />}
          onClick={() => onAddWidget('variable')}
          disabled={!capabilities.canAddWidgets}
        />
        <ToolbarButton
          label="Divisória"
          icon={<SeparatorHorizontal className="h-3.5 w-3.5" />}
          onClick={() => onAddWidget('divider')}
          disabled={!capabilities.canAddWidgets}
        />
        <ToolbarButton
          label="Tabela"
          icon={<Table className="h-3.5 w-3.5" />}
          onClick={() => onAddWidget('table')}
          disabled={!capabilities.canAddWidgets}
        />
      </div>
    </div>
  );
}
