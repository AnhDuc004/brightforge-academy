import api from "@/lib/axios";
import type { RoleResource, UserResource } from "@/lib/user-management";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type SelectableStudentsParams = {
  page?: number;
  per_page?: number;
  search?: string;
};

export type SelectableStudentsPageResult = {
  items: UserResource[];
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

function normalizeRole(value: unknown): RoleResource | null {
  if (!value || typeof value !== "object") return null;

  const record = asRecord(value);
  if (typeof record.name !== "string") return null;

  return {
    id: typeof record.id === "string" ? record.id : "",
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : null,
    name: record.name,
    description: typeof record.description === "string" ? record.description : null,
    permissions: [],
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

function normalizeUser(value: unknown): UserResource {
  const record = asRecord(value);
  const roles = Array.isArray(record.roles) ? record.roles.map(normalizeRole).filter(Boolean) : [];

  return {
    id: String(record.id ?? ""),
    email: typeof record.email === "string" ? record.email : "",
    display_name: typeof record.display_name === "string" ? record.display_name : "",
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : "",
    is_active: record.is_active !== false,
    roles: roles as RoleResource[],
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

function normalizePage<T>(
  payload: unknown,
  fallback: Required<Pick<SelectableStudentsParams, "page" | "per_page">>,
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

export async function listSelectableStudents(params: SelectableStudentsParams = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 15;

  const response = await api.get<ApiEnvelope<unknown>>("/v1/assignments/selectable-students", {
    params: {
      page,
      per_page,
      ...(params.search ? { search: params.search } : {}),
    },
  });

  const result = normalizePage<UserResource>(response.data, { page, per_page });

  return {
    ...result,
    items: result.items.map(normalizeUser),
  };
}
