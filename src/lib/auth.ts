export const ACCESS_TOKEN_KEY = "access_token";
export const TENANT_ID_KEY = "tenant_id";

export type AuthProfile = {
  id: string;
  email: string;
  display_name: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string | null;
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

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(TENANT_ID_KEY);
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
