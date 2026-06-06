import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { BackgroundFX } from "@/components/landing/BackgroundFX";
import { PulseDot } from "@/components/landing/primitives";
import { PageTransition } from "@/components/PageTransition";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Consultas PRO" },
      { name: "description", content: "Acesse sua conta Consultas PRO." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to backend (ngrok). Mantém UX consistente por enquanto.
    setTimeout(() => setLoading(false), 900);
  }

  return (
    <div className="dark min-h-screen text-foreground relative isolate overflow-hidden">
      <BackgroundFX />

      <PageTransition>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-[420px]">
            {/* Brand */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 mono text-[12px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand text-[10px]">
                ◆
              </span>
              <span className="text-foreground">CONSULTAS</span>
              <span className="text-brand">_PRO</span>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="hud-frame hud-corners relative mt-6 rounded-md p-8"
            >
              <span className="hud-bl" />
              <span className="hud-br" />

              <div className="flex items-center gap-2 mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
                <PulseDot />
                <span>ACESSO SEGURO</span>
              </div>

              <h1 className="mt-4 text-3xl font-medium tracking-[-0.025em]">
                Entrar na <span className="brand-text">plataforma</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use suas credenciais corporativas para continuar.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="voce@empresa.com.br"
                />
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between text-[12px]">
                  <label className="inline-flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" className="h-3 w-3 accent-[var(--color-brand)]" />
                    Manter conectado
                  </label>
                  <a href="#" className="text-brand hover:underline">
                    Esqueci a senha
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_36px_-8px_var(--color-brand)] hover:shadow-[0_0_48px_-4px_var(--color-brand)] transition-shadow disabled:opacity-60"
                >
                  {loading ? "Verificando…" : "Entrar"}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-[11px] mono tracking-[0.18em] uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-hairline" />
                <span>OU</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>

              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface/60 px-4 py-2.5 text-sm text-foreground hover:bg-surface backdrop-blur transition-colors"
              >
                Acessar via SSO corporativo
              </button>
            </motion.div>

            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              Não tem conta?{" "}
              <a href="#" className="text-brand hover:underline">
                Falar com vendas
              </a>
            </p>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 group relative flex items-center rounded-md border border-hairline bg-surface/40 backdrop-blur transition-colors focus-within:border-brand/60 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand)_18%,transparent)]">
        <span className="pl-3 text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
      </div>
    </label>
  );
}
