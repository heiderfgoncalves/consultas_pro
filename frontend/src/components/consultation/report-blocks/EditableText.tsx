import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onChange?: (val: string) => void;
  className?: string;
  tag?: 'span' | 'p' | 'h2' | 'h3' | 'div';
  placeholder?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function EditableText({
  value,
  onChange,
  className,
  tag: TagName = 'span',
  placeholder,
  style,
  onClick,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  if (!onChange) return <TagName className={className} style={style} onClick={onClick}>{value}</TagName>;

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 w-full">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onChange(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditing(false);
              onChange(text);
            }
            if (e.key === 'Escape') {
              setEditing(false);
              setText(value);
            }
          }}
          className="bg-primary/5 border border-primary/30 rounded px-1.5 py-0.5 outline-none text-foreground w-full text-inherit"
          style={{ fontSize: 'inherit', fontWeight: 'inherit', ...style }}
        />
        <button
          onClick={() => {
            setEditing(false);
            onChange(text);
          }}
          className="text-primary hover:text-primary/80 flex-shrink-0"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setText(value);
          }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <span
      className="group/edit inline-flex items-center gap-1.5 relative cursor-pointer hover:bg-primary/5 rounded px-0.5 -mx-0.5 transition-colors"
      onClick={() => { onClick?.(); setEditing(true); }}
    >
      <TagName className={className} style={style}>
        {text || placeholder || 'Clique para editar'}
      </TagName>
      <span className="opacity-0 group-hover/edit:opacity-100 transition-all duration-200 flex items-center gap-0.5 flex-shrink-0">
        <span className="bg-primary text-primary-foreground rounded p-0.5">
          <Pencil className="w-2.5 h-2.5" />
        </span>
      </span>
    </span>
  );
}
