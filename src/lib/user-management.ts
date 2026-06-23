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

export type PermissionResource = {
  id: string;
  resource: string;
  action: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type PermissionApiResource = {
  id: string;
  resource:
    | string
    | {
        id?: string;
        resource?: string;
        action?: string;
        created_at?: string | null;
        updated_at?: string | null;
      };
  action: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoleResource = {
  id: string;
  tenant_id?: string | null;
  name: string;
  description?: string | null;
  permissions: PermissionResource[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserResource = {
  id: string;
  email: string;
  display_name: string;
  tenant_id: string;
  is_active: boolean;
  roles: RoleResource[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ListParams = {
  page?: number;
  per_page?: number;
};

export type PageResult<T> = {
  items: T[];
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

function normalizePermission(permission: PermissionApiResource): PermissionResource {
  const resourceName =
    typeof permission.resource === "string"
      ? permission.resource
      : permission.resource.resource ?? "";

  const actionName =
    typeof permission.resource === "string"
      ? permission.action
      : permission.resource.action ?? permission.action;

  return {
    id: permission.id,
    resource: resourceName,
    action: actionName,
    created_at: permission.created_at ?? null,
    updated_at: permission.updated_at ?? null,
  };
}

function normalizePage<T>(
  payload: unknown,
  fallback: Required<Pick<ListParams, "page" | "per_page">>,
): PageResult<T> {
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

async function fetchPage<T>(
  path: string,
  params: ListParams = {},
): Promise<PageResult<T>> {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 50;
  const response = await api.get<ApiEnvelope<unknown>>(path, {
    params: { page, per_page },
  });

  return normalizePage<T>(response.data, { page, per_page });
}

async function fetchAllPages<T>(path: string, params: Omit<ListParams, "page"> = {}) {
  const firstPage = await fetchPage<T>(path, { ...params, page: 1 });
  if (firstPage.lastPage <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.lastPage - 1 }, (_, index) =>
      fetchPage<T>(path, { ...params, page: index + 2, per_page: firstPage.perPage }),
    ),
  );

  return [firstPage.items, ...remainingPages.map((page) => page.items)].flat();
}

export function listUsers(params: ListParams = {}) {
  return fetchPage<UserResource>("/v1/users", params);
}

export function listRoles(params: ListParams = {}) {
  return fetchPage<RoleResource>("/v1/roles", params);
}

export function listPermissions(params: ListParams = {}) {
  return fetchPage<PermissionApiResource>("/v1/permissions", params).then((result) => ({
    ...result,
    items: result.items.map(normalizePermission),
  }));
}

export function listAllUsers(params: Omit<ListParams, "page"> = {}) {
  return fetchAllPages<UserResource>("/v1/users", params);
}

export function listAllRoles(params: Omit<ListParams, "page"> = {}) {
  return fetchAllPages<RoleResource>("/v1/roles", params);
}

export function listAllPermissions(params: Omit<ListParams, "page"> = {}) {
  return fetchAllPages<PermissionApiResource>("/v1/permissions", params).then((items) =>
    items.map(normalizePermission),
  );
}
