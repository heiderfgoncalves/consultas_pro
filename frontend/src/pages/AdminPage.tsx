import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import {
  Building2, ClipboardList, Copy, CreditCard, KeyRound, Mail, Plus, RefreshCw, Route, Search, Trash2, UserPlus, Users,
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
  const [tab, setTab] = useState('users');

  const enabled = !!accessToken && user?.backendRole === 'PLATFORM_ADMIN';

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

  if (user?.backendRole !== 'PLATFORM_ADMIN') {
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

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-10 bg-muted/50 p-1 rounded-lg gap-1 flex-wrap h-auto min-h-10">
          <TabsTrigger value="users" className="text-sm gap-2"><Users className="w-4 h-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="companies" className="text-sm gap-2"><Building2 className="w-4 h-4" /> Contas</TabsTrigger>
          <TabsTrigger value="tokens" className="text-sm gap-2"><KeyRound className="w-4 h-4" /> Tokens API</TabsTrigger>
          <TabsTrigger value="invites" className="text-sm gap-2"><Mail className="w-4 h-4" /> Convites</TabsTrigger>
          <TabsTrigger value="audit" className="text-sm gap-2"><ClipboardList className="w-4 h-4" /> Auditoria</TabsTrigger>
          <TabsTrigger value="api-access" className="text-sm gap-2"><Route className="w-4 h-4" /> Acesso API</TabsTrigger>
        </TabsList>

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
    onSuccess: () => {
      toast.success('Usuário atualizado');
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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'COMPANY_MANAGER' | 'COMPANY_OWNER'>('USER');
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
      setRole(
        initial.role === 'PLATFORM_ADMIN' || initial.role === 'USER' || initial.role === 'COMPANY_MANAGER' || initial.role === 'COMPANY_OWNER'
          ? (initial.role === 'PLATFORM_ADMIN' ? 'USER' : initial.role)
          : 'USER',
      );
      setCompanyId(initial.companyId ?? '__none__');
      setAccountStatus(initial.accountStatus ?? 'ACTIVE');
    }
    if (mode === 'create') {
      setFullName('');
      setEmail('');
      setDocument('');
      setPhone('');
      setPassword('');
      setRole('USER');
      setCompanyId('__none__');
      setAccountStatus('ACTIVE');
    }
  }, [open, initial, mode]);

  const save = () => {
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
        ...(companyId !== '__none__' ? { companyId } : {}),
      });
      return;
    }
    if (initial?.role === 'PLATFORM_ADMIN') {
      const body: Record<string, unknown> = {
        fullName,
        email,
        document: document || null,
        phone: phone || null,
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
      companyId: companyId === '__none__' ? null : companyId,
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
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputCls} />
            </div>
          ) : (
            <div className="space-y-1">
              <label className={labelCls}>Nova senha (opcional)</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputCls} placeholder="Deixe em branco para não alterar" />
            </div>
          )}
          {!(mode === 'edit' && initial?.role === 'PLATFORM_ADMIN') && (
            <div className="space-y-1">
              <label className={labelCls}>Papel</label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="COMPANY_MANAGER">COMPANY_MANAGER</SelectItem>
                  <SelectItem value="COMPANY_OWNER">COMPANY_OWNER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
      <div className="flex justify-end">
        <Button type="button" size="sm" className="h-9 gradient-primary text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova conta
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
                      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setCreditRow(c)}>
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Crédito
                      </Button>
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
}: {
  accessToken: string | null;
  tokens: AdminTokenRow[];
  companies: AdminCompanyRow[];
  loading: boolean;
  invalidateAll: () => void;
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
                    {t.isActive ? (
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => revokeMut.mutate({ id: t.id, active: false })}>
                        Revogar
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => revokeMut.mutate({ id: t.id, active: true })}>
                        Reativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
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
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
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
                <Button type="button" className="flex-1" onClick={() => { setCreateOpen(false); setNewTokenPlain(null); setLabel(''); setCompanyId(''); }}>
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
