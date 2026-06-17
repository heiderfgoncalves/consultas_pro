import { lazy, Suspense, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileLanding = lazy(() =>
  import("@/components/landing/MobileLanding").then((module) => ({
    default: module.MobileLanding,
  })),
);

const DesktopLanding = lazy(() =>
  import("@/components/landing/DesktopLanding").then((module) => ({
    default: module.DesktopLanding,
  })),
);

export default function Index() {
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Inicializando Consultas PRO...
          </span>
        </div>
      </div>
    );
  }

  const forceLanding = searchParams.get("bypass") === "true" || searchParams.get("landing") === "true";

  if (isAuthenticated && !forceLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      id="top"
      className="min-h-screen text-foreground selection:bg-brand/20 relative overflow-x-hidden pb-12"
    >
      <Suspense fallback={<LandingSkeleton mobile={isMobile} />}>
        {isMobile ? (
          <MobileLanding />
        ) : (
          <DesktopLanding />
        )}
      </Suspense>
    </div>
  );
}

function LandingSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <div className={mobile ? "px-4 pt-20" : "mx-auto max-w-7xl px-6 pt-28"}>
      <div className="h-[520px] rounded-[2rem] border border-hairline bg-surface/30 animate-pulse" />
    </div>
  );
}
