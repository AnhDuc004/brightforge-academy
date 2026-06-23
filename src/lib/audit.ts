import api from "@/lib/axios";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PaginationMeta = {
  total?: number;
  count?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  from?: number | null;
  to?: number | null;
};

export type AuditLogActor = {
  id: string;
  email: string;
  display_name: string;
};

export type AuditLogMetadata = Record<string, unknown> | null;

export type AuditLogResource = {
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  actor: AuditLogActor | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip: string | null;
  metadata: AuditLogMetadata;
  created_at: string;
};

export type AuditLogListParams = {
  page?: number;
  per_page?: number;
  action?: string;
  resource_type?: string;
};

export type AuditLogPageResult = {
  items: AuditLogResource[];
  total: number;
  count: number;
  page: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumberOrNull(value: unknown) {
  return typeof value === "number" ? value : null;
}

function unwrapEnvelope<T>(payload: unknown) {
  const record = asRecord(payload);
  return (record.data ?? payload) as T;
}

function normalizeActor(value: unknown): AuditLogActor | null {
  if (!value || typeof value !== "object") return null;

  const record = asRecord(value);
  if (typeof record.id !== "string") return null;

  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : "",
    display_name:
      typeof record.display_name === "string"
        ? record.display_name
        : typeof record.name === "string"
          ? record.name
          : "Unknown",
  };
}

function normalizeMetadata(value: unknown): AuditLogMetadata {
  if (!value || typeof value !== "object") return null;
  return asRecord(value);
}

function normalizeAuditLog(value: unknown): AuditLogResource {
  const record = asRecord(value);

  return {
    id: String(record.id ?? ""),
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : null,
    actor_id: typeof record.actor_id === "string" ? record.actor_id : null,
    actor: normalizeActor(record.actor),
    action: typeof record.action === "string" ? record.action : "unknown",
    resource_type: typeof record.resource_type === "string" ? record.resource_type : "unknown",
    resource_id: typeof record.resource_id === "string" ? record.resource_id : null,
    ip: typeof record.ip === "string" ? record.ip : null,
    metadata: normalizeMetadata(record.metadata),
    created_at: typeof record.created_at === "string" ? record.created_at : "",
  };
}

function normalizePage<T>(
  payload: unknown,
  fallback: Required<Pick<AuditLogListParams, "page" | "per_page">>,
): {
  items: T[];
  total: number;
  count: number;
  page: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
} {
  const data = unwrapEnvelope<unknown>(payload);
  const record = asRecord(data);
  const nestedData = asRecord(record.data);
  const items =
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(nestedData.data) && nestedData.data) ||
    [];

  const pagination = asRecord(record.pagination ?? record.meta ?? nestedData.pagination ?? nestedData.meta);
  const total = Number(pagination.total ?? record.total ?? items.length);
  const count = Number(pagination.count ?? record.count ?? items.length);
  const page = Number(pagination.current_page ?? pagination.page ?? record.current_page ?? fallback.page);
  const perPage = Number(pagination.per_page ?? pagination.perPage ?? record.per_page ?? fallback.per_page);
  const lastPage = Number(
    pagination.last_page ?? pagination.lastPage ?? record.last_page ?? Math.max(1, Math.ceil(total / perPage)),
  );

  return {
    items: items as T[],
    total,
    count,
    page,
    perPage,
    lastPage,
    from: asNumberOrNull(pagination.from),
    to: asNumberOrNull(pagination.to),
  };
}

export async function listAuditLogs(params: AuditLogListParams = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 15;

  const response = await api.get<ApiEnvelope<unknown>>("/v1/audit-logs", {
    params: {
      page,
      per_page,
      ...(params.action ? { action: params.action } : {}),
      ...(params.resource_type ? { resource_type: params.resource_type } : {}),
    },
  });

  const result = normalizePage<unknown>(response.data, { page, per_page });

  return {
    ...result,
    items: result.items.map(normalizeAuditLog),
  };
}
