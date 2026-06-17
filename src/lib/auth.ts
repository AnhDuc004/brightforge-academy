export const ACCESS_TOKEN_KEY = "access_token";
export const TENANT_ID_KEY = "tenant_id";
export const AUTH_CONTEXT_KEY = "auth_context";

export type AuthPermission = {
  resource: string;
  action: string;
};

export type AuthRole = {
  id?: string;
  name: string;
  description?: string | null;
};

export type AuthTenant = {
  id: string;
  name: string;
  slug?: string | null;
  plan?: string | null;
  is_active?: boolean;
};

export type AuthProfile = {
  id: string;
  email: string;
  display_name: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string | null;
  roles?: AuthRole[];
};

export type AuthContext = {
  user: AuthProfile;
  tenant: AuthTenant | null;
  permissions: AuthPermission[];
  roles: AuthRole[];
};

const FIELD_NAME_ALIASES: Record<string, string> = {
  password_confirmation: "passwordConfirmation",
  passwordConfirm: "passwordConfirmation",
  confirm_password: "passwordConfirmation",
  confirmPassword: "passwordConfirmation",
};

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getTenantId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_ID_KEY);
}

export function getStoredAuthContext(): AuthContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as AuthContext) : null;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.dispatchEvent(new Event("auth-change"));
}

export function setTenantId(tenantId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TENANT_ID_KEY, tenantId);
  window.dispatchEvent(new Event("auth-change"));
}

export function setAuthSession(token: string, tenantId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);

  if (tenantId?.trim()) {
    window.localStorage.setItem(TENANT_ID_KEY, tenantId.trim());
  }

  window.dispatchEvent(new Event("auth-change"));
}

export function setAuthContext(context: AuthContext | null) {
  if (typeof window === "undefined") return;

  if (context) {
    window.localStorage.setItem(AUTH_CONTEXT_KEY, JSON.stringify(context));
    if (context.tenant?.id) {
      window.localStorage.setItem(TENANT_ID_KEY, context.tenant.id);
    } else if (context.user.tenant_id) {
      window.localStorage.setItem(TENANT_ID_KEY, context.user.tenant_id);
    }
  } else {
    window.localStorage.removeItem(AUTH_CONTEXT_KEY);
  }

  window.dispatchEvent(new Event("auth-change"));
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(TENANT_ID_KEY);
  window.localStorage.removeItem(AUTH_CONTEXT_KEY);
  window.dispatchEvent(new Event("auth-change"));
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export function getInitials(displayName?: string | null, email?: string | null) {
  const source = (displayName || email || "").trim();
  if (!source) return "U";

  const words = source
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function normalizeFieldName(field: string) {
  return FIELD_NAME_ALIASES[field] ?? field;
}

function toMessage(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item == null ? "" : String(item)))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function collectFieldErrors(source: unknown) {
  const fieldErrors: Record<string, string> = {};

  if (!source || typeof source !== "object") {
    return fieldErrors;
  }

  for (const [field, value] of Object.entries(source as Record<string, unknown>)) {
    const message = toMessage(value);
    if (!message) continue;
    fieldErrors[normalizeFieldName(field)] = message;
  }

  return fieldErrors;
}

export function parseApiError(error: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fallbackMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";

  if (!error || typeof error !== "object") {
    return { message: fallbackMessage, fieldErrors: {} };
  }

  const axiosError = error as {
    response?: {
      data?: unknown;
      status?: number;
    };
    message?: string;
  };

  const responseData = axiosError.response?.data;

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;

    const nestedErrors = [data.errors, data.validationErrors, data.errorBag, data.messages].find(
      (candidate) => candidate && typeof candidate === "object",
    );

    const fieldErrors = collectFieldErrors(nestedErrors);

    const message =
      toMessage(data.message) ||
      toMessage(data.error) ||
      toMessage(data.detail) ||
      toMessage(data.title) ||
      (typeof data.status === "string" ? data.status : "") ||
      (Object.keys(fieldErrors).length > 0
        ? "Vui lòng kiểm tra lại các trường được đánh dấu."
        : "") ||
      axiosError.message ||
      fallbackMessage;

    return { message, fieldErrors };
  }

  return {
    message: axiosError.message || fallbackMessage,
    fieldErrors: {},
  };
}

export function pickAccessToken(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const visited = new Set<unknown>();
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    const record = current as Record<string, unknown>;
    const directToken = record.access_token ?? record.accessToken ?? record.token;
    if (typeof directToken === "string" && directToken.trim()) {
      return directToken;
    }

    for (const key of ["data", "result", "payload", "user", "meta"]) {
      const nested = record[key];
      if (nested && typeof nested === "object") {
        stack.push(nested);
      }
    }
  }

  return null;
}

export function pickTenantId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const visited = new Set<unknown>();
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    const record = current as Record<string, unknown>;
    const directTenantId = record.tenant_id ?? record.tenantId;
    if (typeof directTenantId === "string" && directTenantId.trim()) {
      return directTenantId.trim();
    }

    const tenant = record.tenant;
    if (tenant && typeof tenant === "object") {
      const tenantRecord = tenant as Record<string, unknown>;
      const nestedTenantId = tenantRecord.id ?? tenantRecord.tenant_id ?? tenantRecord.tenantId;
      if (typeof nestedTenantId === "string" && nestedTenantId.trim()) {
        return nestedTenantId.trim();
      }
      stack.push(tenant);
    }

    for (const key of ["data", "result", "payload", "user", "profile", "meta"]) {
      const nested = record[key];
      if (nested && typeof nested === "object") {
        stack.push(nested);
      }
    }
  }

  return null;
}

function normalizePermission(value: unknown): AuthPermission | null {
  if (!value) return null;

  if (typeof value === "string") {
    const [resource, action = "*"] = value.split(".");
    return resource ? { resource, action } : null;
  }

  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const resource = record.resource;
  const action = record.action;

  if (typeof resource === "string" && typeof action === "string") {
    return { resource, action };
  }

  return null;
}

function normalizeRole(value: unknown): AuthRole | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value };
  }

  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const name = record.name;
  if (typeof name !== "string") return null;

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    name,
    description: typeof record.description === "string" ? record.description : null,
  };
}

function normalizeUser(value: unknown): AuthProfile {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const roles = Array.isArray(record.roles) ? record.roles.map(normalizeRole).filter(Boolean) : [];

  return {
    id: String(record.id ?? ""),
    email: String(record.email ?? ""),
    display_name: String(record.display_name ?? record.name ?? record.email ?? "User"),
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : null,
    is_active: record.is_active !== false,
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    roles: roles as AuthRole[],
  };
}

function normalizeTenant(value: unknown): AuthTenant | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  return {
    id: record.id,
    name: String(record.name ?? record.slug ?? "Tenant"),
    slug: typeof record.slug === "string" ? record.slug : null,
    plan: typeof record.plan === "string" ? record.plan : null,
    is_active: typeof record.is_active === "boolean" ? record.is_active : undefined,
  };
}

export function normalizeAuthContext(payload: unknown): AuthContext | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const userSource = data.user ?? root.user;
  if (!userSource) return null;

  const user = normalizeUser(userSource);
  const tenant = normalizeTenant(data.tenant ?? root.tenant);
  const roleSources = [
    ...(Array.isArray(data.roles) ? data.roles : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];
  const roles = roleSources.map(normalizeRole).filter(Boolean) as AuthRole[];
  const permissions = (Array.isArray(data.permissions) ? data.permissions : [])
    .map(normalizePermission)
    .filter(Boolean) as AuthPermission[];

  return {
    user,
    tenant,
    permissions,
    roles,
  };
}

export function permissionKey(permission: AuthPermission) {
  return `${permission.resource}.${permission.action}`;
}

export function hasPermission(context: AuthContext | null | undefined, required?: string | string[]) {
  if (!required) return true;
  if (!context) return false;

  const requirements = Array.isArray(required) ? required : [required];
  if (requirements.length === 0) return true;

  const roleNames = context.roles.map((role) => role.name.toLowerCase());
  if (roleNames.some((name) => name === "tenant admin" || name === "system admin" || name === "admin")) {
    return true;
  }

  const granted = new Set(context.permissions.map(permissionKey));
  if (granted.has("*.*")) return true;

  return requirements.some((item) => {
    const [resource, action = "*"] = item.split(".");
    return (
      granted.has(item) ||
      granted.has(`${resource}.*`) ||
      granted.has(`*.${action}`) ||
      granted.has(`${resource}.manage`)
    );
  });
}
