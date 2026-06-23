import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Building2, Check, ClipboardList, Copy, CreditCard, FileCode, Globe, KeyRound, Mail, Palette, Plus, RefreshCw, Route, Search, Trash2, UserPlus, Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  type AdminCompanyRow,
  type AdminInviteRow,
  type AdminAuditRow,
  type AdminTokenRow,
  type AdminUserRow,
  type UserAccountStatus,
  createAdminCompanyApi,
  createAdminInviteCompanyApi,
  createAdminInviteUserApi,
  createAdminTokenApi,
  createAdminUserApi,
  deleteAdminUserApi,
  getAdminAudit,
  getAdminCompanies,
  getAdminCompanyLedger,
  getAdminInvites,
  getAdminTokens,
  getAdminUsers,
  patchAdminCompanyApi,
  patchAdminTokenApi,
  patchAdminUserApi,
  postAdminCompanyCreditApi,
  resendAdminInviteApi,
  revokeAdminInviteApi,
} from '@/api/admin-panel';
import { RoleEndpointAccessTab } from '@/components/admin/RoleEndpointAccessTab';
import { RealtimeConsultationsTab } from '@/components/admin/RealtimeConsultationsTab';
import { AdminPlansTab } from '@/components/admin/AdminPlansTab';
import { apiBase } from '@/lib/api';

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide';
const inputCls = 'h-9 text-sm bg-background placeholder:text-muted-foreground';

function money(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
}

function statusBadge(status: UserAccountStatus) {
  const map: Record<UserAccountStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    BLOCKED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return map[status] ?? map.ACTIVE;
}

export default function AdminPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tokensDefaultCompanyId, setTokensDefaultCompanyId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    return searchParams.get('aba') || 'realtime-consultations';
  });

  useEffect(() => {
    const fromUrl = searchParams.get('aba');
    if (fromUrl && fromUrl !== tab) {
      setTab(fromUrl);
    }
  }, [searchParams]);

  const setTabWithUrl = (newTab: string) => {
    setTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('aba', newTab);
      return next;
    }, { replace: true });
  };

  const isPlatformAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const isCustomerAdmin = user?.backendRole === 'CUSTOMER_ADMIN';
  const isCompanyAdmin = user?.backendRole === 'COMPANY_ADMIN';
  const hasAdminAccess = ['PLATFORM_ADMIN', 'CUSTOMER_ADMIN', 'COMPANY_ADMIN'].includes(user?.backendRole ?? '');

  const enabled = !!accessToken && hasAdminAccess;

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers(accessToken),
    enabled,
  });
  const companiesQuery = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => getAdminCompanies(accessToken),
    enabled,
  });
  const tokensQuery = useQuery({
    queryKey: ['admin-tokens'],
    queryFn: () => getAdminTokens(accessToken),
    enabled,
  });
  const invitesQuery = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => getAdminInvites(accessToken),
    enabled,
  });
  const auditQuery = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => getAdminAudit(accessToken, 100),
    enabled,
  });

  const companies = companiesQuery.data ?? [];
  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.company?.name ?? '').toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-tokens'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-endpoint-access'] });
  };

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Administração" subtitle="Usuários, contas, tokens, convites e auditoria">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuários…"
            className={`pl-9 w-56 h-9 ${inputCls}`}
          />
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTabWithUrl} className="space-y-4">
        <TabsList className="h-10 bg-muted/50 p-1 rounded-lg gap-1 flex-wrap h-auto min-h-10">
          <TabsTrigger value="realtime-consultations" className="text-sm gap-2"><Globe className="w-4 h-4" /> Consultas em Tempo Real</TabsTrigger>
          <TabsTrigger value="users" className="text-sm gap-2"><Users className="w-4 h-4" /> Usuários</TabsTrigger>
          {isCompanyAdmin ? (
            <TabsTrigger value="companies" className="text-sm gap-2"><Building2 className="w-4 h-4" /> Minha Empresa</TabsTrigger>
          ) : (
            <TabsTrigger value="companies" className="text-sm gap-2"><Building2 className="w-4 h-4" /> Contas</TabsTrigger>
          )}
          <TabsTrigger value="tokens" className="text-sm gap-2"><KeyRound className="w-4 h-4" /> Tokens API</TabsTrigger>
          <TabsTrigger value="invites" className="text-sm gap-2"><Mail className="w-4 h-4" /> Convites</TabsTrigger>
          <TabsTrigger value="audit" className="text-sm gap-2"><ClipboardList className="w-4 h-4" /> Auditoria</TabsTrigger>
          <TabsTrigger value="api-access" className="text-sm gap-2"><Route className="w-4 h-4" /> Acesso API</TabsTrigger>
          <TabsTrigger value="white-label" className="text-sm gap-2"><FileCode className="w-4 h-4" /> Guia White-Label</TabsTrigger>
          {isPlatformAdmin && (
            <TabsTrigger value="plans-management" className="text-sm gap-2"><CreditCard className="w-4 h-4" /> Planos & Assinaturas</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="realtime-consultations" className="space-y-3">
          <RealtimeConsultationsTab accessToken={accessToken} />
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          <UsersTab
            accessToken={accessToken}
            users={filteredUsers}
            companies={companies}
            loading={usersQuery.isLoading}
            onRefresh={() => void usersQuery.refetch()}
            invalidateAll={invalidateAll}
          />
        </TabsContent>

        <TabsContent value="companies" className="space-y-3">
          <CompaniesTab
            accessToken={accessToken}
            companies={companiesQuery.data ?? []}
            loading={companiesQuery.isLoading}
            invalidateAll={invalidateAll}
          />
        </TabsContent>

        <TabsContent value="tokens" className="space-y-3">
          <TokensTab
            accessToken={accessToken}
            tokens={tokensQuery.data ?? []}
            companies={companies}
            loading={tokensQuery.isLoading}
            invalidateAll={invalidateAll}
            defaultOpenCompanyId={tokensDefaultCompanyId}
            onCloseDefaultOpen={() => setTokensDefaultCompanyId(null)}
          />
        </TabsContent>

        <TabsContent value="invites" className="space-y-3">
          <InvitesTab
            accessToken={accessToken}
            invites={invitesQuery.data ?? []}
            companies={companies}
            loading={invitesQuery.isLoading}
            invalidateAll={invalidateAll}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <AuditTab
            rows={auditQuery.data ?? []}
            loading={auditQuery.isLoading}
            onRefresh={() => void auditQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="api-access" className="space-y-3">
          <RoleEndpointAccessTab accessToken={accessToken} enabled={enabled} />
        </TabsContent>

        <TabsContent value="white-label" className="space-y-3">
          <WhiteLabelTab
            companies={companies}
            tokens={tokensQuery.data ?? []}
            onNavigateToTokens={(companyId) => {
              setTokensDefaultCompanyId(companyId);
              setTabWithUrl('tokens');
            }}
          />
        </TabsContent>

        {isPlatformAdmin && (
          <TabsContent value="plans-management" className="space-y-3">
            <AdminPlansTab accessToken={accessToken} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function UsersTab({
  accessToken,
  users,
  companies,
  loading,
  onRefresh,
  invalidateAll,
}: {
  accessToken: string | null;
  users: AdminUserRow[];
  companies: AdminCompanyRow[];
  loading: boolean;
  onRefresh: () => void;
  invalidateAll: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createAdminUserApi>[1]) => createAdminUserApi(accessToken, body),
    onSuccess: () => {
      toast.success('Usuário criado');
      setCreateOpen(false);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminUserApi>[2] }) =>
      patchAdminUserApi(accessToken, id, body),
    onSuccess: (updatedUser) => {
      toast.success('Usuário atualizado');
      
      if (updatedUser.id === user?.id) {
        const session = {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          document: updatedUser.document,
          phone: updatedUser.phone,
          role: updatedUser.role,
          companyId: updatedUser.companyId,
          accountStatus: updatedUser.accountStatus,
        };
        localStorage.setItem('cp_user_json', JSON.stringify(session));
        
        useAuthStore.setState({
          sessionUser: session,
          user: {
            id: session.id,
            name: session.fullName,
            email: session.email,
            document: session.document ?? '',
            phone: session.phone ?? '',
            accountType: 'master',
            accessLevel: 0,
            backendRole: 'PLATFORM_ADMIN',
            companyName: 'Consultas PRO',
            balance: user.balance,
            priceTable: 'Admin',
          },
        });
        
        void useAuthStore.getState().refreshBalance();
      }

      setEditRow(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAdminUserApi(accessToken, id),
    onSuccess: () => {
      toast.success('Usuário excluído');
      setDeleteId(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onRefresh}>Atualizar</Button>
        <Button type="button" size="sm" className="h-9 gradient-primary text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Novo usuário
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{u.role}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.company?.name ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(u.accountStatus)}`}>
                      {u.accountStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setEditRow(u)}>Editar</Button>
                      {u.role !== 'PLATFORM_ADMIN' && (
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => setDeleteId(u.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && users.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</p>
        )}
      </div>

      <UserFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo usuário"
        companies={companies}
        mode="create"
        saving={createMut.isPending}
        onSubmit={(data) => createMut.mutate(data)}
      />

      {editRow && (
        <UserFormDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          title="Editar usuário"
          companies={companies}
          mode="edit"
          initial={editRow}
          saving={patchMut.isPending}
          onSubmit={(data) => patchMut.mutate({ id: editRow.id, body: data })}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita se não houver vínculos no banco. Caso existam consultas ou outros registros, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delMut.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserFormDialog({
  open,
  onClose,
  title,
  companies,
  mode,
  initial,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  companies: AdminCompanyRow[];
  mode: 'create' | 'edit';
  initial?: AdminUserRow;
  saving: boolean;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const { user: authUser } = useAuthStore();
  const isPlatformAdmin = authUser?.backendRole === 'PLATFORM_ADMIN';
  const isCustomerAdmin = authUser?.backendRole === 'CUSTOMER_ADMIN';
  const isCompanyAdmin = authUser?.backendRole === 'COMPANY_ADMIN';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('COMPANY_COMMON');
  const [companyId, setCompanyId] = useState<string>('__none__');
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus>('ACTIVE');

  useEffect(() => {
    if (!open) return;
    if (initial && mode === 'edit') {
      setFullName(initial.fullName);
      setEmail(initial.email);
      setDocument(initial.document ?? '');
      setPhone(initial.phone ?? '');
      setPassword('');
      setRole(initial.role);
      setCompanyId(initial.companyId ?? '__none__');
      setAccountStatus(initial.accountStatus ?? 'ACTIVE');
    }
    if (mode === 'create') {
      setFullName('');
      setEmail('');
      setDocument('');
      setPhone('');
      setPassword('');
      if (isCompanyAdmin) {
        setRole('COMPANY_COMMON');
        setCompanyId(authUser?.companyId ?? '__none__');
      } else if (isCustomerAdmin) {
        setRole('COMPANY_ADMIN');
        setCompanyId('__none__');
      } else {
        setRole('COMPANY_COMMON');
        setCompanyId('__none__');
      }
      setAccountStatus('ACTIVE');
    }
  }, [open, initial, mode, isCompanyAdmin, isCustomerAdmin, authUser]);

  const save = () => {
    const targetCompanyId = isCompanyAdmin ? (authUser?.companyId ?? null) : (companyId === '__none__' ? null : companyId);

    if (mode === 'create') {
      if (!fullName || !email || !document || !phone || !password) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      onSubmit({
        fullName,
        email,
        document,
        phone,
        password,
        role,
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      });
      return;
    }
    if (initial?.role === 'PLATFORM_ADMIN') {
      const body: Record<string, unknown> = {
        fullName,
        email,
        document: document || null,
        phone: phone || null,
        companyId: targetCompanyId,
      };
      if (password.trim()) body.password = password;
      onSubmit(body);
      return;
    }
    const body: Record<string, unknown> = {
      fullName,
      email,
      document: document || null,
      phone: phone || null,
      role,
      companyId: targetCompanyId,
      accountStatus,
    };
    if (password.trim()) body.password = password;
    onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === 'create' ? 'Cadastro administrativo com senha inicial.' : 'Altere dados, papel, conta ou status de acesso.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className={labelCls}>Nome</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>E-mail</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Documento (CPF/CNPJ)</label>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} className={inputCls} disabled={mode === 'edit' && initial?.role === 'PLATFORM_ADMIN'} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Telefone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          {mode === 'create' ? (
            <div className="space-y-1">
              <label className={labelCls}>Senha inicial</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputCls} autoComplete="new-password" />
            </div>
          ) : (
            <div className="space-y-1">
              <label className={labelCls}>Nova senha (opcional)</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputCls} placeholder="Deixe em branco para não alterar" autoComplete="new-password" />
            </div>
          )}
          {!(mode === 'edit' && initial?.role === 'PLATFORM_ADMIN') && (
            <div className="space-y-1">
              <label className={labelCls}>Papel</label>
              <Select value={role} onValueChange={(v) => setRole(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isPlatformAdmin && (
                    <>
                      <SelectItem value="PLATFORM_ADMIN">PLATFORM_ADMIN</SelectItem>
                      <SelectItem value="CUSTOMER_ADMIN">CUSTOMER_ADMIN</SelectItem>
                      <SelectItem value="COMPANY_ADMIN">COMPANY_ADMIN</SelectItem>
                      <SelectItem value="COMPANY_COMMON">COMPANY_COMMON</SelectItem>
                      <SelectItem value="COMPANY_OWNER">COMPANY_OWNER (legado)</SelectItem>
                      <SelectItem value="COMPANY_MANAGER">COMPANY_MANAGER (legado)</SelectItem>
                      <SelectItem value="USER">USER (legado)</SelectItem>
                    </>
                  )}
                  {isCustomerAdmin && (
                    <>
                      <SelectItem value="COMPANY_ADMIN">COMPANY_ADMIN</SelectItem>
                      <SelectItem value="COMPANY_COMMON">COMPANY_COMMON</SelectItem>
                    </>
                  )}
                  {isCompanyAdmin && (
                    <SelectItem value="COMPANY_COMMON">COMPANY_COMMON</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isCompanyAdmin && (
            <div className="space-y-1">
              <label className={labelCls}>Conta (empresa)</label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === 'edit' && initial?.role !== 'PLATFORM_ADMIN' && (
            <div className="space-y-1">
              <label className={labelCls}>Status da conta</label>
              <Select value={accountStatus} onValueChange={(v) => setAccountStatus(v as UserAccountStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" className="gradient-primary text-primary-foreground" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompaniesTab({
  accessToken,
  companies,
  loading,
  invalidateAll,
}: {
  accessToken: string | null;
  companies: AdminCompanyRow[];
  loading: boolean;
  invalidateAll: () => void;
}) {
  const { user: authUser } = useAuthStore();
  const isCompanyAdmin = authUser?.backendRole === 'COMPANY_ADMIN';
  const isCustomerAdmin = authUser?.backendRole === 'CUSTOMER_ADMIN';
  const isPlatformAdmin = authUser?.backendRole === 'PLATFORM_ADMIN';

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminCompanyRow | null>(null);
  const [creditRow, setCreditRow] = useState<AdminCompanyRow | null>(null);
  const [ledgerRow, setLedgerRow] = useState<AdminCompanyRow | null>(null);

  const createMut = useMutation({
    mutationFn: (body: { name: string; document: string; email?: string; phone?: string }) =>
      createAdminCompanyApi(accessToken, body),
    onSuccess: () => {
      toast.success('Conta criada');
      setCreateOpen(false);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminCompanyApi>[2] }) =>
      patchAdminCompanyApi(accessToken, id, body),
    onSuccess: () => {
      toast.success('Conta atualizada');
      setEditRow(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creditMut = useMutation({
    mutationFn: ({ id, amount, description }: { id: string; amount: number; description?: string }) =>
      postAdminCompanyCreditApi(accessToken, id, { amount, description }),
    onSuccess: () => {
      toast.success('Crédito lançado');
      setCreditRow(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {!isCompanyAdmin && (
        <div className="flex justify-end">
          <Button type="button" size="sm" className="h-9 gradient-primary text-primary-foreground" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nova conta
          </Button>
        </div>
      )}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.document}</TableCell>
                  <TableCell>{c._count.users}</TableCell>
                  <TableCell>{money(c.wallet?.balance)}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'default' : 'secondary'} className="text-xs">
                      {c.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setEditRow(c)}>Editar</Button>
                      {!isCompanyAdmin && (
                        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setCreditRow(c)}>
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> Crédito
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setLedgerRow(c)}>Extrato</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CompanyCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        saving={createMut.isPending}
        onSubmit={(b) => createMut.mutate(b)}
      />

      {editRow && (
        <CompanyEditDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          row={editRow}
          saving={patchMut.isPending}
          onSubmit={(body) => patchMut.mutate({ id: editRow.id, body })}
        />
      )}

      {creditRow && (
        <CreditDialog
          open={!!creditRow}
          onClose={() => setCreditRow(null)}
          companyName={creditRow.name}
          saving={creditMut.isPending}
          onSubmit={(amount, description) => creditMut.mutate({ id: creditRow.id, amount, description })}
        />
      )}

      {ledgerRow && (
        <LedgerDialog accessToken={accessToken} row={ledgerRow} onClose={() => setLedgerRow(null)} />
      )}
    </div>
  );
}

function CompanyCreateDialog({
  open,
  onClose,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (b: { name: string; document: string; email?: string; phone?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const save = () => {
    if (!name || !document) {
      toast.error('Nome e documento são obrigatórios');
      return;
    }
    onSubmit({ name, document, email: email || undefined, phone: phone || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta (empresa)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><label className={labelCls}>Nome</label><Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>Documento (CNPJ)</label><Input value={document} onChange={(e) => setDocument(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>E-mail</label><Input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>Telefone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-primary text-primary-foreground" onClick={save} disabled={saving}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompanyEditDialog({
  open,
  onClose,
  row,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  row: AdminCompanyRow;
  saving: boolean;
  onSubmit: (body: Parameters<typeof patchAdminCompanyApi>[2]) => void;
}) {
  const [name, setName] = useState(row.name);
  const [document, setDocument] = useState(row.document);
  const [email, setEmail] = useState(row.email ?? '');
  const [phone, setPhone] = useState(row.phone ?? '');
  const [isActive, setIsActive] = useState(row.isActive);

  const save = () => {
    onSubmit({
      name,
      document,
      email: email || null,
      phone: phone || null,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><label className={labelCls}>Nome</label><Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>Documento</label><Input value={document} onChange={(e) => setDocument(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>E-mail</label><Input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className={labelCls}>Telefone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="co-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />
            <label htmlFor="co-active" className="text-sm">Conta ativa</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-primary text-primary-foreground" onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({
  open,
  onClose,
  companyName,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  saving: boolean;
  onSubmit: (amount: number, description?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const save = () => {
    const n = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Valor inválido');
      return;
    }
    onSubmit(n, description || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crédito administrativo</DialogTitle>
          <DialogDescription>{companyName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><label className={labelCls}>Valor (R$)</label><Input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0,00" /></div>
          <div className="space-y-1"><label className={labelCls}>Descrição</label><Input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-primary text-primary-foreground" onClick={save} disabled={saving}>Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LedgerDialog({
  accessToken,
  row,
  onClose,
}: {
  accessToken: string | null;
  row: AdminCompanyRow;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ['admin-ledger', row.id],
    queryFn: () => getAdminCompanyLedger(accessToken, row.id, 50),
    enabled: !!accessToken,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Extrato — {row.name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 border rounded-md">
          {q.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(q.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-xs">{e.type}</TableCell>
                    <TableCell className="text-xs">{money(e.amount)}</TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate" title={e.description}>{e.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokensTab({
  accessToken,
  tokens,
  companies,
  loading,
  invalidateAll,
  defaultOpenCompanyId,
  onCloseDefaultOpen,
}: {
  accessToken: string | null;
  tokens: AdminTokenRow[];
  companies: AdminCompanyRow[];
  loading: boolean;
  invalidateAll: () => void;
  defaultOpenCompanyId?: string | null;
  onCloseDefaultOpen?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenPlain, setNewTokenPlain] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (body: { label: string; companyId: string; expiresAt?: string }) =>
      createAdminTokenApi(accessToken, body),
    onSuccess: (data) => {
      setNewTokenPlain(data.token);
      toast.success('Token criado — copie agora; não será exibido novamente.');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => patchAdminTokenApi(accessToken, id, active),
    onSuccess: () => {
      toast.success('Token atualizado');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [label, setLabel] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Ativa reativamente a criação de token para uma empresa pré-selecionada (redirecionamento do White-Label)
  useEffect(() => {
    if (defaultOpenCompanyId) {
      const co = companies.find((c) => c.id === defaultOpenCompanyId);
      if (co) {
        setCompanyId(defaultOpenCompanyId);
        setLabel(`Token ${co.name}`);
        setNewTokenPlain(null);
        setCreateOpen(true);
      }
    }
  }, [defaultOpenCompanyId, companies]);

  const handleCloseDialog = () => {
    setCreateOpen(false);
    setNewTokenPlain(null);
    setLabel('');
    setCompanyId('');
    onCloseDefaultOpen?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" className="h-9 gradient-primary text-primary-foreground" onClick={() => { setCreateOpen(true); setNewTokenPlain(null); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo token (conta)
        </Button>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Últimos 4</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.company?.name ?? t.tenant?.name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">…{t.last4}</TableCell>
                  <TableCell className="text-xs">{t.ownerType}</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? 'default' : 'secondary'} className="text-xs">
                      {t.isActive ? 'Ativo' : 'Revogado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Copiar ID do Token"
                        onClick={() => {
                          void navigator.clipboard.writeText(t.id);
                          toast.success('ID do token copiado para a área de transferência! (Nota: Por motivos de segurança, a chave secreta original só é mostrada no momento da criação).');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {t.isActive ? (
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => revokeMut.mutate({ id: t.id, active: false })}>
                          Revogar
                        </Button>
                      ) : (
                        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => revokeMut.mutate({ id: t.id, active: true })}>
                          Reativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) handleCloseDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo token de API</DialogTitle>
            <DialogDescription>Vinculado à conta (empresa) selecionada.</DialogDescription>
          </DialogHeader>
          {!newTokenPlain ? (
            <>
              <div className="space-y-3">
                <div className="space-y-1"><label className={labelCls}>Label</label><Input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} /></div>
                <div className="space-y-1">
                  <label className={labelCls}>Conta</label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={handleCloseDialog}>Cancelar</Button>
                <Button
                  className="gradient-primary text-primary-foreground"
                  disabled={createMut.isPending || !label || !companyId}
                  onClick={() => createMut.mutate({ label, companyId })}
                >
                  Gerar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-xs break-all select-all">
                {newTokenPlain}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    void navigator.clipboard.writeText(newTokenPlain);
                    toast.success('Copiado');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copiar
                </Button>
                <Button type="button" className="flex-1" onClick={handleCloseDialog}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvitesTab({
  accessToken,
  invites,
  companies,
  loading,
  invalidateAll,
}: {
  accessToken: string | null;
  invites: AdminInviteRow[];
  companies: AdminCompanyRow[];
  loading: boolean;
  invalidateAll: () => void;
}) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  const invCo = useMutation({
    mutationFn: (body: { email: string }) => createAdminInviteCompanyApi(accessToken, body),
    onSuccess: (d) => {
      setTokenPreview(d.token);
      toast.success('Convite empresa criado');
      setCompanyOpen(false);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invUs = useMutation({
    mutationFn: (body: { email: string; companyId: string; roleToAssign: 'COMPANY_MANAGER' | 'USER' }) =>
      createAdminInviteUserApi(accessToken, body),
    onSuccess: (d) => {
      setTokenPreview(d.token);
      toast.success('Convite usuário criado');
      setUserOpen(false);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revMut = useMutation({
    mutationFn: (id: string) => revokeAdminInviteApi(accessToken, id),
    onSuccess: () => { toast.success('Convite revogado'); invalidateAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resMut = useMutation({
    mutationFn: (id: string) => resendAdminInviteApi(accessToken, id),
    onSuccess: (d) => {
      setTokenPreview(d.token);
      toast.success('Novo convite gerado');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [emCo, setEmCo] = useState('');
  const [emUs, setEmUs] = useState('');
  const [coUs, setCoUs] = useState('');
  const [roleUs, setRoleUs] = useState<'USER' | 'COMPANY_MANAGER'>('USER');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { setCompanyOpen(true); setTokenPreview(null); }}>
          Convidar empresa
        </Button>
        <Button type="button" size="sm" className="h-9 gradient-primary text-primary-foreground" onClick={() => { setUserOpen(true); setTokenPreview(null); }}>
          Convidar usuário
        </Button>
      </div>

      {tokenPreview && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-2">Token do convite (copie para enviar ao convidado):</p>
          <code className="text-xs break-all block mb-2">{tokenPreview}</code>
          <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(tokenPreview); toast.success('Copiado'); }}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
          </Button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.email}</TableCell>
                  <TableCell className="text-xs">{i.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.company?.name ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{i.status}</Badge></TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(i.expiresAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {i.status === 'PENDING' && (
                        <>
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-1" title="Reenviar" onClick={() => resMut.mutate(i.id)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-1 text-destructive" onClick={() => revMut.mutate(i.id)}>
                            Revogar
                          </Button>
                        </>
                      )}
                      {(i.status === 'EXPIRED' || i.status === 'REVOKED') && (
                        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => resMut.mutate(i.id)}>
                          Reenviar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={companyOpen} onOpenChange={(v) => !v && setCompanyOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convite — nova empresa</DialogTitle></DialogHeader>
          <Input placeholder="E-mail" value={emCo} onChange={(e) => setEmCo(e.target.value)} className={inputCls} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompanyOpen(false)}>Cancelar</Button>
            <Button className="gradient-primary text-primary-foreground" disabled={invCo.isPending} onClick={() => invCo.mutate({ email: emCo })}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userOpen} onOpenChange={(v) => !v && setUserOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convite — usuário na conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="E-mail" value={emUs} onChange={(e) => setEmUs(e.target.value)} className={inputCls} />
            <Select value={coUs} onValueChange={setCoUs}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleUs} onValueChange={(v) => setRoleUs(v as typeof roleUs)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="COMPANY_MANAGER">COMPANY_MANAGER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUserOpen(false)}>Cancelar</Button>
            <Button
              className="gradient-primary text-primary-foreground"
              disabled={invUs.isPending || !emUs || !coUs}
              onClick={() => invUs.mutate({ email: emUs, companyId: coUs, roleToAssign: roleUs })}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditTab({
  rows,
  loading,
  onRefresh,
}: {
  rows: AdminAuditRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onRefresh}>Atualizar</Button>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Quem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-xs font-medium">{r.action}</TableCell>
                  <TableCell className="text-xs">{r.entityType}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[100px]" title={r.entityId ?? ''}>{r.entityId ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.actor?.email ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

interface WhiteLabelTabProps {
  companies: AdminCompanyRow[];
  tokens: AdminTokenRow[];
  onNavigateToTokens: (companyId: string) => void;
}

function WhiteLabelTab({ companies, tokens, onNavigateToTokens }: WhiteLabelTabProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'integration' | 'parameters' | 'styling'>('integration');
  const [copied, setCopied] = useState(false);

  // Seleciona a primeira empresa por padrão se nenhuma estiver selecionada
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const activeToken = useMemo(() => {
    return tokens.find((t) => t.companyId === selectedCompanyId && t.isActive);
  }, [tokens, selectedCompanyId]);

  const hasActiveToken = !!activeToken;

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  const baseUrl = useMemo(() => {
    return apiBase() || window.location.origin;
  }, []);

  const widgetUrl = `${baseUrl}/widget.js`;

  const snippetCode = useMemo(() => {
    const tokenDisplay = activeToken ? `token_parceiro_...${activeToken.last4}` : 'SUA_API_KEY_AQUI';
    const compName = selectedCompany ? selectedCompany.name : 'NOME_DA_EMPRESA';
    const compId = selectedCompanyId || 'ID_DA_EMPRESA';
    const compDoc = selectedCompany ? selectedCompany.document : 'CNPJ_DA_EMPRESA';

    return `<!-- 1. Elemento de marcação HTML onde o widget de consulta será injetado -->
<!-- Integração White-Label para a empresa: ${compName} (ID: ${compId}, Documento: ${compDoc}) -->
<div id="cpro-widget-root"></div>

<!-- 2. Carrega o script do widget direto da plataforma -->
<script src="${widgetUrl}"></script>

<!-- 3. Inicializa e renderiza o widget de consultas com suas credenciais -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const widget = new ConsultasProWidget({
      targetId: 'cpro-widget-root',
      
      // Chave de API ativa para ${compName}
      apiKey: '${tokenDisplay}', // Nota: Substitua pela chave secreta real fornecida na criação do token
      
      // [OPCIONAL] Vincule as consultas de forma granular ao ID do seu cliente final (ex: no app de estilo da ${compName})
      // Permite que você controle saldo ou transações do seu sub-cliente de forma transparente.
      externalUserId: '${compId}',
      
      // [OPCIONAL] Define se o widget deve injetar o visual premium automático (padrão: true)
      // useDefaultStyles: true
    });

    // Inicializa a interface de consultas
    widget.init();
  });
</script>`;
  }, [widgetUrl, activeToken, selectedCompany, selectedCompanyId]);

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Snippet de código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Integração White-Label (Widget JS)</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Disponibilize o mecanismo de consultas no sistema ou site dos seus clientes finais, utilizando um script embutido simples de alta fidelidade visual.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="max-w-xs space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selecionar Empresa Parceira</label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!hasActiveToken ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Token de API Faltante ou Inativo</h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                  Para habilitar e usar as funções do widget de integração White-Label para a empresa{' '}
                  <strong className="font-bold">{selectedCompany?.name || 'parceira'}</strong>, é obrigatório possuir um Token de API ativo no banco de dados. Sem ele, as requisições enviadas pelo widget JS não serão autenticadas e serão bloqueadas com erro.
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium"
                onClick={() => selectedCompanyId && onNavigateToTokens(selectedCompanyId)}
              >
                Criar Token de API Agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Empresa parceira com credencial ativa: <strong className="font-medium text-foreground">{activeToken.label}</strong> (Fim: …{activeToken.last4})
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-6 flex items-center">
                  PRONTO PARA USO
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-background border-border/80 text-foreground hover:bg-muted hover:text-foreground gap-1.5 font-medium"
                  onClick={() => {
                    const testUrl = `/teste-integracao.html?apiKey=${activeToken.id}`;
                    window.open(testUrl, '_blank');
                  }}
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Testar Integração Rápida
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-background border-border/80 text-foreground hover:bg-muted hover:text-foreground gap-1.5 font-medium"
                  onClick={() => {
                    const cleanName = selectedCompany ? selectedCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'test';
                    const sandboxUrl = `/test-whitelabel.html?apiKey=${activeToken.id}&externalUserId=test_user_${cleanName}&scriptUrl=${encodeURIComponent(widgetUrl)}`;
                    window.open(sandboxUrl, '_blank');
                  }}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Visualizar na Sandbox
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex bg-muted/30 border-b border-border p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('integration')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeSubTab === 'integration'
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Script de Integração
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('parameters')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeSubTab === 'parameters'
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Controle de Saldo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('styling')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeSubTab === 'styling'
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Customização Visual (CSS)
                </button>
              </div>

              <div className="p-5">
                {activeSubTab === 'integration' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Como integrar o widget no site</h3>
                      <p className="text-xs text-muted-foreground">
                        Copie o snippet de marcação HTML e javascript abaixo e cole no local desejado da página web do seu parceiro ou sistema de white-label.
                      </p>
                    </div>

                    <div className="relative rounded-lg bg-[#181818] p-4 border border-border font-mono text-xs text-zinc-200 shadow-lg">
                      <div className="flex justify-between items-center pb-2 mb-3 border-b border-zinc-800 text-zinc-500 text-[10px]">
                        <span>INTEGRAÇÃO DO WIDGET JS</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5 text-[11px]"
                          onClick={() => handleCopy(snippetCode)}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                      <pre className="whitespace-pre overflow-x-auto select-all">{snippetCode}</pre>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-xs">
                      <span className="font-semibold text-foreground block">⚠️ Atenção à Chave de API</span>
                      <p className="text-muted-foreground leading-relaxed">
                        Por motivos de segurança e conformidade, os tokens de API são criptografados como hashes unidirecionais no banco de dados. O snippet acima possui um placeholder com o final do token ativo para sua referência (`...{activeToken.last4}`). Você deve substituí-lo pela <strong className="font-bold text-foreground">Chave de API real em formato texto puro</strong> fornecida na geração inicial do token. Se você perdeu a chave original, basta revogar o token atual e gerar um novo instantaneamente na aba <strong className="font-medium text-foreground">Tokens API</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {activeSubTab === 'parameters' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Microgerenciamento de Saldo e Usuários Finais</h3>
                      <p className="text-xs text-muted-foreground">
                        Entenda como funciona o sistema de saldo e faturamento de consultas executadas através do script White-Label.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Por padrão, todas as consultas processadas através deste widget White-Label são cobradas e debitadas diretamente do saldo da carteira da empresa parceira (<strong className="font-semibold text-foreground">{selectedCompany?.name}</strong>).
                      </p>
                      
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-primary" /> O que é o <code className="font-mono bg-primary/10 px-1 py-0.5 rounded text-[11px]">externalUserId</code>?
                        </span>
                        <p className="leading-relaxed">
                          É o identificador exclusivo que você pode passar no construtor do widget representando o cliente final da sua plataforma parceira (por exemplo, a conta da <code className="font-mono">rprotec</code> ou de algum sub-cliente deles).
                        </p>
                        <p className="leading-relaxed">
                          Ao especificar o <code className="font-mono">externalUserId</code>, o nosso sistema vinculará essa transação e a consulta a este usuário. No backend, o saldo principal da empresa parceira será debitado, mas você poderá extrair faturamentos detalhados, relatórios e demonstrativos de consumo agrupados por cada <code className="font-mono">externalUserId</code> individual de forma ágil, facilitando a cobrança ou o repasse de moedas internas do seu app.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="font-semibold text-foreground block">Exemplo Prático (Caso do Parceiro rprotec):</span>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Seu cliente (ex: rprotec) compra R$ 500,00 em saldo de consultas no seu sistema, o que é registrado na carteira principal deles.</li>
                          <li>Os usuários internos da rprotec compram créditos em moedas dentro do app deles.</li>
                          <li>Quando um usuário da rprotec faz uma consulta no widget, o sistema deles inicializa o widget injetando o ID do usuário do app deles como <code className="font-mono">externalUserId: 'user_rprotec_987'</code>.</li>
                          <li>O nosso backend deduz o valor da consulta do saldo principal da rprotec e registra o consumo especificamente para <code className="font-mono text-foreground">user_rprotec_987</code>.</li>
                          <li>A rprotec desconta o saldo de moedas internamente no painel deles. Todos ganham com transparência total!</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'styling' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Customização Visual do Widget</h3>
                      <p className="text-xs text-muted-foreground">
                        O widget já injeta automaticamente uma folha de estilos CSS premium de alta qualidade (glassmorphism, loaders elegantes e tabelas responsivas). Caso queira herdar a tipografia e as cores do site de seu parceiro, você pode desativar os estilos padrão e criar sua própria folha de estilos.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <p className="text-muted-foreground">
                        Para desativar a injeção do CSS embutido, defina <code className="font-mono text-foreground">useDefaultStyles: false</code> no construtor do widget:
                      </p>

                      <div className="rounded-lg bg-[#181818] p-3 border border-border font-mono text-[11px] text-zinc-300">
                        useDefaultStyles: false
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="font-semibold text-foreground block">Classes CSS disponíveis para sobrescrever:</span>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground">
                                <th className="p-2.5">Classe CSS</th>
                                <th className="p-2.5">Descrição do Elemento</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-muted-foreground text-[11px]">
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-widget-container</td>
                                <td className="p-2.5">Container externo principal do widget.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-search-box</td>
                                <td className="p-2.5">Caixa do formulário de busca/consulta.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-input</td>
                                <td className="p-2.5">Campos de entrada e de seleção de consulta.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-button</td>
                                <td className="p-2.5">Botão primário para disparar a consulta.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-loader-container</td>
                                <td className="p-2.5">Container exibido durante o carregamento de dados.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-spinner</td>
                                <td className="p-2.5">Spinner animado de carregamento.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-section</td>
                                <td className="p-2.5">Blocos ou seções de dados retornados do resultado.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-section-title</td>
                                <td className="p-2.5">Título decorado de cada seção do resultado.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-grid</td>
                                <td className="p-2.5">Grade responsiva para exibir cartões chave-valor.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-table-wrapper</td>
                                <td className="p-2.5">Container com overflow para rolagem horizontal fluida de tabelas.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-table</td>
                                <td className="p-2.5">Tabela estilizada de resultados mais complexos.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-foreground font-semibold">.cpro-error-container</td>
                                <td className="p-2.5">Caixa de mensagem em caso de erros ou falhas.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
