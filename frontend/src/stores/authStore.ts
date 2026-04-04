import { create } from 'zustand';
import {
  ApiError,
  apiRequest,
  getStoredPreviewLevel,
  getStoredToken,
  getStoredUserJson,
  setStoredPreviewLevel,
  setStoredToken,
  setStoredUserJson,
} from '@/lib/api';

// 0 = admin, 1 = master (empresa), 2 = operator (UI / navegação)
export type AccessLevel = 0 | 1 | 2;

export type BackendRole = 'PLATFORM_ADMIN' | 'COMPANY_OWNER' | 'COMPANY_MANAGER' | 'USER';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: BackendRole;
  companyId: string | null;
  /** Presente quando o backend envia (login /users/me futuro) */
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
}

export interface User {
  id: string;
  name: string;
  email: string;
  document: string;
  phone: string;
  accountType: 'individual' | 'master';
  accessLevel: AccessLevel;
  /** Papel real no backend (para rotas admin) */
  backendRole: BackendRole;
  companyName?: string;
  balance: number;
  priceTable: string;
  avatar?: string;
}

interface AuthState {
  /** `true` após a primeira hidratação a partir do localStorage (evita redirect prematuro para /login). */
  hydrated: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  sessionUser: SessionUser | null;
  /** Somente PLATFORM_ADMIN: nível exibido na navegação (simulação de perfil). */
  previewAccessLevel: AccessLevel;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchProfile: (level: AccessLevel) => void;
  hydrate: () => Promise<void>;
}

const previewProfiles: Record<Exclude<AccessLevel, 0>, Omit<User, 'backendRole'>> = {
  1: {
    id: 'preview-master',
    name: 'Carlos Eduardo Silva',
    email: 'carlos@empresa.com.br',
    document: '12.345.678/0001-90',
    phone: '(11) 99999-8888',
    accountType: 'master',
    accessLevel: 1,
    companyName: 'Silva & Associados LTDA',
    balance: 1247.5,
    priceTable: 'Padrão',
  },
  2: {
    id: 'preview-operator',
    name: 'Ana Souza',
    email: 'ana@empresa.com.br',
    document: '987.654.321-00',
    phone: '(11) 98888-7777',
    accountType: 'individual',
    accessLevel: 2,
    balance: 1247.5,
    priceTable: 'Padrão',
  },
};

function roleToAccessLevel(role: BackendRole): AccessLevel {
  if (role === 'PLATFORM_ADMIN') return 0;
  if (role === 'COMPANY_OWNER' || role === 'COMPANY_MANAGER') return 1;
  return 2;
}

function buildUser(session: SessionUser, previewAccessLevel: AccessLevel): User {
  if (session.role === 'PLATFORM_ADMIN') {
    if (previewAccessLevel === 1) {
      return { ...previewProfiles[1], backendRole: 'PLATFORM_ADMIN' };
    }
    if (previewAccessLevel === 2) {
      return { ...previewProfiles[2], backendRole: 'PLATFORM_ADMIN' };
    }
    return {
      id: session.id,
      name: session.fullName,
      email: session.email,
      document: session.document ?? '',
      phone: session.phone ?? '',
      accountType: 'master',
      accessLevel: 0,
      backendRole: 'PLATFORM_ADMIN',
      companyName: 'Consultas PRO',
      balance: 0,
      priceTable: 'Admin',
    };
  }

  const level = roleToAccessLevel(session.role);
  return {
    id: session.id,
    name: session.fullName,
    email: session.email,
    document: session.document ?? '',
    phone: session.phone ?? '',
    accountType: session.companyId ? 'master' : 'individual',
    accessLevel: level,
    backendRole: session.role,
    companyName: undefined,
    balance: 0,
    priceTable: 'Padrão',
  };
}

function parsePreview(stored: string | null): AccessLevel {
  if (stored === '0' || stored === '1' || stored === '2') return Number(stored) as AccessLevel;
  return 0;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  isAuthenticated: false,
  accessToken: null,
  sessionUser: null,
  previewAccessLevel: 0,
  user: null,

  login: async (email, password) => {
    const data = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      token: null,
    });

    const session = {
      ...data.user,
      role: data.user.role as BackendRole,
    };

    setStoredToken(data.accessToken);
    setStoredUserJson(JSON.stringify(session));

    const preview =
      session.role === 'PLATFORM_ADMIN' ? parsePreview(getStoredPreviewLevel()) : 0;
    if (session.role === 'PLATFORM_ADMIN') {
      setStoredPreviewLevel(String(preview));
    } else {
      setStoredPreviewLevel(null);
    }

    set({
      hydrated: true,
      isAuthenticated: true,
      accessToken: data.accessToken,
      sessionUser: session,
      previewAccessLevel: session.role === 'PLATFORM_ADMIN' ? preview : roleToAccessLevel(session.role),
      user: buildUser(session, session.role === 'PLATFORM_ADMIN' ? preview : 0),
    });
  },

  logout: () => {
    setStoredToken(null);
    setStoredUserJson(null);
    setStoredPreviewLevel(null);
    set({
      hydrated: true,
      isAuthenticated: false,
      accessToken: null,
      sessionUser: null,
      previewAccessLevel: 0,
      user: null,
    });
  },

  switchProfile: (level) => {
    const { sessionUser } = get();
    if (!sessionUser || sessionUser.role !== 'PLATFORM_ADMIN') return;
    setStoredPreviewLevel(String(level));
    set({
      previewAccessLevel: level,
      user: buildUser(sessionUser, level),
    });
  },

  hydrate: async () => {
    const token = getStoredToken();
    const raw = getStoredUserJson();
    if (!token || !raw) {
      set({
        hydrated: true,
        isAuthenticated: false,
        accessToken: null,
        sessionUser: null,
        user: null,
        previewAccessLevel: 0,
      });
      return;
    }
    let session: SessionUser;
    try {
      session = JSON.parse(raw) as SessionUser;
      session.role = session.role as BackendRole;
    } catch {
      get().logout();
      return;
    }

    try {
      await apiRequest<unknown>('/auth/me', {
        method: 'GET',
        token,
      });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        get().logout();
        return;
      }
      /* Rede ou erro transitório: mantém sessão local para não deslogar no dev/HMR. */
    }

    const preview =
      session.role === 'PLATFORM_ADMIN'
        ? parsePreview(getStoredPreviewLevel())
        : roleToAccessLevel(session.role);

    set({
      hydrated: true,
      isAuthenticated: true,
      accessToken: token,
      sessionUser: session,
      previewAccessLevel: session.role === 'PLATFORM_ADMIN' ? preview : roleToAccessLevel(session.role),
      user: buildUser(session, session.role === 'PLATFORM_ADMIN' ? preview : 0),
    });
  },
}));

export const accessLevelLabels: Record<AccessLevel, string> = {
  0: 'Administrador',
  1: 'Mestre',
  2: 'Operador',
};
