import { Suspense, lazy, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiBase } from '@/lib/api';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = lazy(() => import('swagger-ui-react'));

const ALLOWED_ROLES = new Set(['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER']);

export default function ApiDocsPage() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!sessionUser?.role || !ALLOWED_ROLES.has(sessionUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const specUrl = `${apiBase()}/openapi.json`;

  const requestInterceptor = useMemo(() => {
    return (req: { url?: string; headers?: Record<string, string> }) => {
      if (accessToken) {
        req.headers = req.headers ?? {};
        req.headers.Authorization = `Bearer ${accessToken}`;
      }
      return req;
    };
  }, [accessToken]);

  if (!apiBase()) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Configure <code className="text-xs">VITE_API_URL</code> para carregar a documentação OpenAPI.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] min-h-[480px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Documentação da API</h1>
        <p className="text-sm text-muted-foreground mt-1">
          OpenAPI 3 — requisições usam o token da sua sessão. Operações marcadas com cadeado exigem JWT no
          &quot;Authorize&quot;.
        </p>
      </div>
      <div className="flex-1 rounded-lg border border-border overflow-hidden bg-card swagger-docs-wrap">
        <Suspense
          fallback={
            <div className="p-6 text-sm text-muted-foreground">Carregando interface Swagger…</div>
          }
        >
          <SwaggerUI
            url={specUrl}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            persistAuthorization
            requestInterceptor={requestInterceptor}
          />
        </Suspense>
      </div>
    </div>
  );
}
