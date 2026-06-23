import api from "@/lib/axios";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type TenantResource = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type TenantPayload = Pick<TenantResource, "name" | "slug" | "plan" | "is_active">;

export type TenantPage = {
  items: TenantResource[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeTenant(value: unknown): TenantResource {
  const record = asRecord(value);

  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? "Unnamed tenant"),
    slug: String(record.slug ?? ""),
    plan: toStringOrNull(record.plan),
    is_active: record.is_active !== false,
    created_at: toStringOrNull(record.created_at),
    updated_at: toStringOrNull(record.updated_at),
  };
}

export const tenantAdminApi = {
  async list(params: { page?: number; per_page?: number } = {}): Promise<TenantPage> {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 15;
    const response = await api.get<ApiEnvelope<unknown>>("/v1/tenants", {
      params: { page, per_page: perPage },
    });
    const paginator = asRecord(response.data.data);
    const items = Array.isArray(paginator.data) ? paginator.data.map(normalizeTenant) : [];

    return {
      items,
      total: Number(paginator.total ?? items.length),
      page: Number(paginator.current_page ?? page),
      perPage: Number(paginator.per_page ?? perPage),
      lastPage: Number(paginator.last_page ?? 1),
      from: typeof paginator.from === "number" ? paginator.from : null,
      to: typeof paginator.to === "number" ? paginator.to : null,
    };
  },

  async get(tenantId: string) {
    const response = await api.get<ApiEnvelope<unknown>>(`/v1/tenants/${tenantId}`);
    return normalizeTenant(response.data.data);
  },

  async create(payload: TenantPayload) {
    const response = await api.post<ApiEnvelope<unknown>>("/v1/tenants", payload);
    return normalizeTenant(response.data.data);
  },

  async update(tenantId: string, payload: TenantPayload) {
    const response = await api.put<ApiEnvelope<unknown>>(`/v1/tenants/${tenantId}`, payload);
    return normalizeTenant(response.data.data);
  },

  async remove(tenantId: string) {
    await api.delete(`/v1/tenants/${tenantId}`);
  },
};
