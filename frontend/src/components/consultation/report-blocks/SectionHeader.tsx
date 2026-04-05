import type { LucideIcon } from 'lucide-react';
import EditableText from './EditableText';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  badge?: string;
  isEdit?: boolean;
  onTitleChange?: (value: string) => void;
}

export default function SectionHeader({
  icon: Icon,
  title,
  badge,
  isEdit,
  onTitleChange,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 min-w-[32px] rounded-lg bg-muted border border-border flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <EditableText
        value={title}
        onChange={onTitleChange}
        className="text-[13px] font-bold uppercase text-muted-foreground tracking-wider whitespace-nowrap"
        tag="h3"
      />
      <div className="flex-1 border-b-2 border-dashed border-border ml-1 min-w-[24px]" />
      {badge && (
        <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
          {isEdit ? '— registros' : badge}
        </span>
      )}
    </div>
  );
}
