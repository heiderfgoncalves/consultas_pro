import { Fragment, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { BackendRole } from '@/api/admin-panel';
import {
  getAdminEndpointAccess,
  putAdminEndpointAccess,
  type ExternalEndpointCatalogItem,
  type RoleEndpointAccessMatrix,
} from '@/api/admin-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROLE_COLUMNS: { role: BackendRole; label: string; adminBypass: boolean }[] = [
  { role: 'USER', label: 'Operador', adminBypass: false },
  { role: 'COMPANY_MANAGER', label: 'Gestor', adminBypass: false },
  { role: 'COMPANY_OWNER', label: 'Dono da conta', adminBypass: false },
  { role: 'PLATFORM_ADMIN', label: 'Admin plataforma', adminBypass: true },
];

function cloneMatrix(m: RoleEndpointAccessMatrix): RoleEndpointAccessMatrix {
  const out: RoleEndpointAccessMatrix = {};
  for (const [role, row] of Object.entries(m)) {
    out[role] = { ...row };
  }
  return out;
}

export function RoleEndpointAccessTab({
  accessToken,
  enabled,
}: {
  accessToken: string | null;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-endpoint-access'],
    queryFn: () => getAdminEndpointAccess(accessToken),
    enabled,
  });

  const [draft, setDraft] = useState<RoleEndpointAccessMatrix | null>(null);

  useEffect(() => {
    if (q.data?.matrix) {
      setDraft(cloneMatrix(q.data.matrix));
    }
  }, [q.data?.matrix]);

  const catalog = q.data?.catalog ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, ExternalEndpointCatalogItem[]>();
    for (const row of catalog) {
      const g = row.group || 'Outros';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(row);
    }
    return [...map.entries()];
  }, [catalog]);

  const flatPayload = useMemo(() => {
    if (!draft || !catalog.length) return [];
    const keys = catalog.map((c) => c.routeKey);
    const roles = ROLE_COLUMNS.map((c) => c.role);
    const rows: { role: BackendRole; routeKey: string; isEnabled: boolean }[] = [];
    for (const role of roles) {
      for (const routeKey of keys) {
        const isPlatformAdmin = role === 'PLATFORM_ADMIN';
        const isEnabled = isPlatformAdmin ? true : (draft[role]?.[routeKey] ?? true);
        rows.push({ role, routeKey, isEnabled });
      }
    }
    return rows;
  }, [draft, catalog]);

  const isDirty = useMemo(() => {
    if (!draft || !q.data?.matrix) return false;
    const roles = ROLE_COLUMNS.map((c) => c.role);
    const keys = catalog.map((c) => c.routeKey);
    for (const role of roles) {
      if (role === 'PLATFORM_ADMIN') continue;
      for (const routeKey of keys) {
        if ((draft[role]?.[routeKey] ?? true) !== (q.data.matrix[role]?.[routeKey] ?? true)) {
          return true;
        }
      }
    }
    return false;
  }, [draft, q.data?.matrix, catalog]);

  const saveMut = useMutation({
    mutationFn: () => putAdminEndpointAccess(accessToken, flatPayload),
    onSuccess: (data) => {
      toast.success('Política de endpoints atualizada');
      setDraft(cloneMatrix(data.matrix));
      void queryClient.invalidateQueries({ queryKey: ['admin-endpoint-access'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (role: BackendRole, routeKey: string, checked: boolean) => {
    if (role === 'PLATFORM_ADMIN') return;
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [routeKey]: checked,
        },
      };
    });
  };

  if (q.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando matriz de acesso…</p>;
  }
  if (q.isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar a política de endpoints.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground max-w-3xl">
            Controle quais endpoints HTTP de <strong>consultas</strong> cada papel pode chamar (JWT).
            Útil para white-label e documentação futura; o admin da plataforma sempre tem acesso total na API,
            independentemente desta grade.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Chaves estáveis alinhadas a escopos de token: prefixo <code className="text-xs bg-muted px-1 rounded">api.</code>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || saveMut.isPending || !draft}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Endpoint</TableHead>
              <TableHead className="min-w-[100px]">Método</TableHead>
              {ROLE_COLUMNS.map((col) => (
                <TableHead key={col.role} className="text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{col.label}</span>
                    {col.adminBypass && (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        sempre liberado
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(([group, rows]) => (
              <Fragment key={group}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={2 + ROLE_COLUMNS.length} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </TableCell>
                </TableRow>
                {rows.map((ep) => (
                  <TableRow key={ep.routeKey}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{ep.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{ep.path}</div>
                        <div className="text-[11px] text-muted-foreground">{ep.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {ep.method}
                      </Badge>
                    </TableCell>
                    {ROLE_COLUMNS.map((col) => {
                      const checked = col.adminBypass
                        ? true
                        : (draft?.[col.role]?.[ep.routeKey] ?? true);
                      return (
                        <TableCell key={`${col.role}-${ep.routeKey}`} className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={checked}
                              disabled={col.adminBypass}
                              onCheckedChange={(v) => toggle(col.role, ep.routeKey, v === true)}
                              className={cn(col.adminBypass && 'opacity-60')}
                              aria-label={`${col.label} — ${ep.label}`}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
