import { apiRequest } from '@/lib/api';

export type BackendRole = 'PLATFORM_ADMIN' | 'COMPANY_OWNER' | 'COMPANY_MANAGER' | 'USER';
export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: BackendRole;
  companyId: string | null;
  isActive: boolean;
  accountStatus: UserAccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  company?: { id: string; name: string; slug: string } | null;
}

export interface AdminCompanyRow {
  id: string;
  name: string;
  slug: string;
  document: string;
  email: string | null;
  phone: string | null;
  tenantId: string | null;
  isActive: boolean;
  createdAt: string;
  wallet: { id: string; balance: string | number } | null;
  _count: { users: number; consultations: number };
}

export interface AdminInviteRow {
  id: string;
  type: 'COMPANY' | 'USER';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  email: string;
  companyId: string | null;
  roleToAssign: BackendRole | null;
  expiresAt: string;
  createdAt: string;
  company?: { id: string; name: string; slug: string } | null;
}

export interface AdminTokenRow {
  id: string;
  ownerType: string;
  tenantId: string | null;
  companyId: string | null;
  label: string;
  last4: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string } | null;
  company?: { id: string; name: string; slug: string } | null;
}

export interface AdminAuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; fullName: string; email: string } | null;
}

export interface LedgerEntryRow {
  id: string;
  type: string;
  amount: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;
  description: string;
  createdAt: string;
}

function tok(t: string | null) {
  return t;
}

export async function getAdminUsers(accessToken: string | null) {
  return apiRequest<AdminUserRow[]>('/admin/users', { method: 'GET', token: tok(accessToken) });
}

export async function getAdminUser(accessToken: string | null, userId: string) {
  return apiRequest<AdminUserRow>(`/admin/users/${userId}`, { method: 'GET', token: tok(accessToken) });
}

export async function createAdminUserApi(
  accessToken: string | null,
  body: {
    fullName: string;
    email: string;
    document: string;
    phone: string;
    password: string;
    role: 'USER' | 'COMPANY_MANAGER' | 'COMPANY_OWNER';
    companyId?: string;
  },
) {
  return apiRequest<AdminUserRow>('/admin/users', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchAdminUserApi(
  accessToken: string | null,
  userId: string,
  body: {
    fullName?: string;
    email?: string;
    document?: string | null;
    phone?: string | null;
    role?: 'USER' | 'COMPANY_MANAGER' | 'COMPANY_OWNER';
    companyId?: string | null;
    accountStatus?: UserAccountStatus;
    password?: string;
  },
) {
  return apiRequest<AdminUserRow>(`/admin/users/${userId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteAdminUserApi(accessToken: string | null, userId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/users/${userId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function getAdminCompanies(accessToken: string | null) {
  return apiRequest<AdminCompanyRow[]>('/admin/companies', { method: 'GET', token: tok(accessToken) });
}

export async function createAdminCompanyApi(
  accessToken: string | null,
  body: { name: string; document: string; email?: string; phone?: string; tenantId?: string },
) {
  return apiRequest<AdminCompanyRow>('/admin/companies', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchAdminCompanyApi(
  accessToken: string | null,
  companyId: string,
  body: {
    name?: string;
    document?: string;
    email?: string | null;
    phone?: string | null;
    tenantId?: string | null;
    isActive?: boolean;
  },
) {
  return apiRequest<AdminCompanyRow>(`/admin/companies/${companyId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function postAdminCompanyCreditApi(
  accessToken: string | null,
  companyId: string,
  body: { amount: number; description?: string },
) {
  return apiRequest<LedgerEntryRow>(`/admin/companies/${companyId}/credit`, {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function getAdminCompanyLedger(accessToken: string | null, companyId: string, take = 50) {
  return apiRequest<LedgerEntryRow[]>(`/admin/companies/${companyId}/ledger?take=${take}`, {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function getAdminInvites(accessToken: string | null, params?: { companyId?: string; status?: string }) {
  const sp = new URLSearchParams();
  if (params?.companyId) sp.set('companyId', params.companyId);
  if (params?.status) sp.set('status', params.status);
  sp.set('take', '100');
  const q = sp.toString();
  return apiRequest<AdminInviteRow[]>(`/admin/invites?${q}`, { method: 'GET', token: tok(accessToken) });
}

export async function createAdminInviteCompanyApi(
  accessToken: string | null,
  body: { email: string; metadata?: Record<string, unknown> },
) {
  return apiRequest<{ inviteId: string; token: string; expiresAt: string }>('/admin/invites/company', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function createAdminInviteUserApi(
  accessToken: string | null,
  body: {
    email: string;
    companyId: string;
    roleToAssign: 'COMPANY_MANAGER' | 'USER';
    metadata?: Record<string, unknown>;
  },
) {
  return apiRequest<{ inviteId: string; token: string; expiresAt: string }>('/admin/invites/user', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function revokeAdminInviteApi(accessToken: string | null, inviteId: string) {
  return apiRequest<AdminInviteRow>(`/admin/invites/${inviteId}/revoke`, {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify({}),
  });
}

export async function resendAdminInviteApi(accessToken: string | null, inviteId: string) {
  return apiRequest<{ inviteId: string; token: string; expiresAt: string }>(
    `/admin/invites/${inviteId}/resend`,
    {
      method: 'POST',
      token: tok(accessToken),
      body: JSON.stringify({}),
    },
  );
}

export async function getAdminTokens(accessToken: string | null) {
  return apiRequest<AdminTokenRow[]>('/admin/tokens', { method: 'GET', token: tok(accessToken) });
}

export async function createAdminTokenApi(
  accessToken: string | null,
  body: {
    label: string;
    companyId?: string;
    tenantId?: string;
    expiresAt?: string;
    scopes?: Record<string, unknown>;
  },
) {
  return apiRequest<{ token: string; apiToken: AdminTokenRow }>('/admin/tokens', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchAdminTokenApi(accessToken: string | null, tokenId: string, isActive: boolean) {
  return apiRequest<AdminTokenRow>(`/admin/tokens/${tokenId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify({ isActive }),
  });
}

export async function getAdminAudit(accessToken: string | null, take = 100) {
  return apiRequest<AdminAuditRow[]>(`/admin/audit?take=${take}`, {
    method: 'GET',
    token: tok(accessToken),
  });
}

export interface ExternalEndpointCatalogItem {
  routeKey: string;
  method: string;
  path: string;
  group: string;
  label: string;
  description: string;
  exposeInDocs: boolean;
}

/** role -> routeKey -> habilitado */
export type RoleEndpointAccessMatrix = Record<string, Record<string, boolean>>;

export async function getAdminEndpointAccess(accessToken: string | null) {
  return apiRequest<{ catalog: ExternalEndpointCatalogItem[]; matrix: RoleEndpointAccessMatrix }>(
    '/admin/access/endpoints',
    { method: 'GET', token: tok(accessToken) },
  );
}

export async function putAdminEndpointAccess(
  accessToken: string | null,
  matrix: { role: BackendRole; routeKey: string; isEnabled: boolean }[],
) {
  return apiRequest<{ catalog: ExternalEndpointCatalogItem[]; matrix: RoleEndpointAccessMatrix }>(
    '/admin/access/endpoints',
    {
      method: 'PUT',
      token: tok(accessToken),
      body: JSON.stringify({ matrix }),
    },
  );
}
