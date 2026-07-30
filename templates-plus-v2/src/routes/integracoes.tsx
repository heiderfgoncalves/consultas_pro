import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { EditorScreen } from "@/features/templates-plus/components/EditorScreen";
import { Database, Tags, FileText, Layers, Settings, Server } from "lucide-react";

const tabs = ["provedores", "consultas", "tipos", "templates", "templates-plus", "configuracoes"] as const;
type Tab = (typeof tabs)[number];

const searchSchema = z.object({
  aba: z.enum(tabs).optional().default("templates-plus"),
});

export const Route = createFileRoute("/integracoes")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Integrações · Templates Plus" },
      { name: "description", content: "Construtor modular de templates de relatório." },
    ],
  }),
  component: IntegracoesPage,
});

const TAB_META: Record<Tab, { label: string; icon: typeof Database }> = {
  "provedores":     { label: "Provedores",     icon: Server },
  "consultas":      { label: "Consultas",      icon: Database },
  "tipos":          { label: "Tipos",          icon: Tags },
  "templates":      { label: "Templates",      icon: FileText },
  "templates-plus": { label: "Templates-plus", icon: Layers },
  "configuracoes":  { label: "Configurações",  icon: Settings },
};

function IntegracoesPage() {
  const { aba } = Route.useSearch();
  const nav = useNavigate({ from: "/integracoes" });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-chrome text-foreground">
      <div className="border-b border-border bg-background px-6 pt-5">
        <h1 className="text-xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-xs text-muted-foreground">Provedores, consultas e mapeamento de dados</p>
        <nav className="mt-4 flex items-end gap-1">
          {tabs.map((t) => {
            const meta = TAB_META[t];
            const Icon = meta.icon;
            const active = t === aba;
            return (
              <Link
                key={t}
                to="/integracoes"
                search={{ aba: t }}
                className={[
                  "flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 text-xs transition-colors",
                  active
                    ? "border-border bg-chrome font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-hidden">
        {aba === "templates-plus" ? (
          <EditorScreen />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aba <code className="mx-1 rounded bg-muted px-1.5 py-0.5">{aba}</code> não implementada nesta entrega — abra
            <button onClick={() => nav({ search: { aba: "templates-plus" } })} className="ml-1 text-accent underline-offset-2 hover:underline">
              Templates-plus
            </button>.
          </div>
        )}
      </div>
    </div>
  );
}
