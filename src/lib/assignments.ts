import api from "@/lib/axios";

export type AssignmentStatus = "assigned" | "started" | "completed" | "expired" | "archived";

export type Assignment = {
  id: string;
  tenant_id?: string | null;
  user_id: string;
  test_id: string;
  due_date: string | null;
  access_token?: string | null;
  max_attempts: number;
  current_attempts: number;
  status: AssignmentStatus;
  created_at?: string | null;
  updated_at?: string | null;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    display_name?: string;
  } | null;
  test?: {
    id?: string;
    title?: string;
    name?: string;
  } | null;
};

export type AssignmentPayload = {
  test_id: string;
  user_id: string;
  due_date: string;
  max_attempts: number;
};

export type AssignmentUpdatePayload = Partial<AssignmentPayload> & {
  status?: AssignmentStatus;
};

export type AssignmentListParams = {
  page?: number;
  per_page?: number;
  user_id?: string;
};

export type AssignmentListResult = {
  assignments: Assignment[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
};

export type AssignmentCreateResult = {
  assignment: Assignment;
  access_token: string | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function unwrapData(payload: unknown) {
  const record = asRecord(payload);
  return record.data ?? payload;
}

function normalizeList(payload: unknown, fallback: Required<Pick<AssignmentListParams, "page" | "per_page">>): AssignmentListResult {
  const data = unwrapData(payload);
  const record = asRecord(data);

  const nestedAssignments = asRecord(record.assignments);
  const items =
    (Array.isArray(record.assignments) && record.assignments) ||
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(nestedAssignments.data) && nestedAssignments.data) ||
    [];

  const meta = asRecord(record.meta ?? record.pagination ?? nestedAssignments.meta ?? nestedAssignments);
  const total = Number(meta.total ?? record.total ?? items.length);
  const page = Number(meta.current_page ?? meta.page ?? record.current_page ?? fallback.page);
  const perPage = Number(meta.per_page ?? meta.perPage ?? record.per_page ?? fallback.per_page);
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? record.last_page ?? Math.max(1, Math.ceil(total / perPage)));

  return {
    assignments: items as Assignment[],
    total,
    page,
    perPage,
    lastPage,
  };
}

function normalizeAssignment(payload: unknown) {
  const data = unwrapData(payload);
  const record = asRecord(data);
  return (record.assignment ?? data) as Assignment;
}

function normalizeCreate(payload: unknown): AssignmentCreateResult {
  const data = unwrapData(payload);
  const record = asRecord(data);

  return {
    assignment: (record.assignment ?? data) as Assignment,
    access_token: typeof record.access_token === "string" ? record.access_token : null,
  };
}

export async function listAssignments(params: AssignmentListParams = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 10;

  const response = await api.get("/v1/assignments", {
    params: {
      page,
      per_page,
      user_id: params.user_id || undefined,
    },
  });

  return normalizeList(response.data, { page, per_page });
}

export async function createAssignment(payload: AssignmentPayload) {
  const response = await api.post("/v1/assignments", payload);
  return normalizeCreate(response.data);
}

export async function getAssignment(id: string) {
  const response = await api.get(`/v1/assignments/${id}`);
  return normalizeAssignment(response.data);
}

export async function updateAssignment(id: string, payload: AssignmentUpdatePayload) {
  const response = await api.put(`/v1/assignments/${id}`, payload);
  return normalizeAssignment(response.data);
}

export async function deleteAssignment(id: string) {
  await api.delete(`/v1/assignments/${id}`);
}

export async function verifyAssignmentToken(access_token: string) {
  const response = await api.post("/v1/assignments/verify-token", { access_token });
  return response.data;
}
