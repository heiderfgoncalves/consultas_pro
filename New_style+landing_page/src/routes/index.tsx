import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { BackgroundFX } from "@/components/landing/BackgroundFX";
import { Hero } from "@/components/landing/Hero";
import { WorkflowSplit } from "@/components/landing/WorkflowSplit";
import { SevenSteps } from "@/components/landing/SevenSteps";
import { LocalOrCloud } from "@/components/landing/LocalOrCloud";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { StartHere } from "@/components/landing/StartHere";
import { Metrics } from "@/components/landing/Metrics";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { PageTransition } from "@/components/PageTransition";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Consultas PRO — Relatórios de crédito que você desenha." },
      { name: "description", content: "SaaS modular para consulta de dívidas, cadastro e crédito. Monte o layout do seu relatório, escolha os blocos, e emita com saldo em carteira." },
      { property: "og:title", content: "Consultas PRO — Pipeline modular de consultas de crédito" },
      { property: "og:description", content: "Templates drag-and-drop, motor math() BR, 40+ fornecedores integrados, white-label completo." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="dark min-h-screen text-foreground relative isolate overflow-x-hidden">
      <BackgroundFX />
      <Nav />
      <PageTransition>
        <main className="relative z-10">
          <Hero />
          <WorkflowSplit />
          <SevenSteps />
          <LocalOrCloud />
          <FeaturesBento />
          <Metrics />
          <StartHere />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </PageTransition>
    </div>
  );
}
