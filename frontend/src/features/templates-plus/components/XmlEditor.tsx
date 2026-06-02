import { useMemo } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";

export function XmlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const lines = useMemo(() => value.split("\n").length, [value]);

  return (
    <div className="tp-scroll relative h-full overflow-auto" style={{ background: "var(--color-code-bg)" }}>
      <div className="flex min-h-full">
        <div
          className="sticky left-0 w-10 shrink-0 select-none border-r border-white/5 py-2 text-right text-[11px]"
          style={{ background: "var(--color-code-gutter)", color: "var(--color-muted-foreground)" }}
        >
          {Array.from({ length: Math.max(lines, 1) }, (_, i) => (
            <div key={i} className="pr-2 leading-[1.6]">{i + 1}</div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) => {
              const html = Prism.highlight(code, Prism.languages.markup, "markup");
              return html.replace(/(\{\$[\w.[\]]+\})/g, '<span style="color:var(--color-code-expr);font-weight:500">$1</span>');
            }}
            padding={8}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-code-fg)",
              minHeight: "100%",
              outline: "none",
            }}
            textareaClassName="focus:outline-none"
          />
        </div>
      </div>
      <style>{`
        .token.tag { color: var(--color-code-tag); }
        .token.attr-name { color: var(--color-code-attr); }
        .token.attr-value, .token.string { color: var(--color-code-string); }
        .token.punctuation { color: var(--color-muted-foreground); }
        .token.comment { color: var(--color-code-comment); font-style: italic; }
      `}</style>
    </div>
  );
}
