import api from "@/lib/axios";

export type AssignmentStatus = "assigned" | "started" | "completed" | "expired" | "archived";
export type AssignmentAccessType = "account" | "token";

export type Assignment = {
  id: string;
  tenant_id?: string | null;
  assigned_by?: string | null;
  test_id: string;
  assignee_id: string;
  user_id?: string;
  due_at: string | null;
  due_date?: string | null;
  access_type: AssignmentAccessType;
  access_token?: string | null;
  max_attempts: number;
  current_attempts?: number;
  status: AssignmentStatus;
  created_at?: string | null;
  updated_at?: string | null;
  assignee?: {
    id?: string;
    email?: string;
    name?: string;
    display_name?: string;
  } | null;
  assigned_by_user?: {
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
  assignee_id: string;
  due_at?: string | null;
  max_attempts: number;
  access_type: AssignmentAccessType;
};

export type AssignmentUpdatePayload = Partial<AssignmentPayload> & {
  status?: AssignmentStatus;
};

export type AssignmentListParams = {
  page?: number;
  per_page?: number;
  assignee_id?: string;
  assigned_by_id?: string;
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

function normalizeAssignmentResource(value: unknown): Assignment {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : null,
    assigned_by: typeof record.assigned_by === "string" ? record.assigned_by : null,
    test_id: String(record.test_id ?? ""),
    assignee_id: String(record.assignee_id ?? record.user_id ?? ""),
    user_id: typeof record.user_id === "string" ? record.user_id : undefined,
    due_at: typeof record.due_at === "string" ? record.due_at : typeof record.due_date === "string" ? record.due_date : null,
    due_date: typeof record.due_date === "string" ? record.due_date : typeof record.due_at === "string" ? record.due_at : null,
    access_type: record.access_type === "account" ? "account" : "token",
    access_token: typeof record.access_token === "string" ? record.access_token : null,
    max_attempts: Number(record.max_attempts ?? 1),
    current_attempts: typeof record.current_attempts === "number" ? record.current_attempts : undefined,
    status: (record.status as AssignmentStatus) ?? "assigned",
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
    assignee:
      record.assignee && typeof record.assignee === "object"
        ? {
            id: typeof asRecord(record.assignee).id === "string" ? String(asRecord(record.assignee).id) : undefined,
            email: typeof asRecord(record.assignee).email === "string" ? String(asRecord(record.assignee).email) : undefined,
            name: typeof asRecord(record.assignee).name === "string" ? String(asRecord(record.assignee).name) : undefined,
            display_name:
              typeof asRecord(record.assignee).display_name === "string"
                ? String(asRecord(record.assignee).display_name)
                : undefined,
          }
        : null,
    assigned_by_user:
      record.assigned_by_user && typeof record.assigned_by_user === "object"
        ? {
            id: typeof asRecord(record.assigned_by_user).id === "string" ? String(asRecord(record.assigned_by_user).id) : undefined,
            email: typeof asRecord(record.assigned_by_user).email === "string" ? String(asRecord(record.assigned_by_user).email) : undefined,
            name: typeof asRecord(record.assigned_by_user).name === "string" ? String(asRecord(record.assigned_by_user).name) : undefined,
            display_name:
              typeof asRecord(record.assigned_by_user).display_name === "string"
                ? String(asRecord(record.assigned_by_user).display_name)
                : undefined,
          }
        : null,
    test:
      record.test && typeof record.test === "object"
        ? {
            id: typeof asRecord(record.test).id === "string" ? String(asRecord(record.test).id) : undefined,
            title: typeof asRecord(record.test).title === "string" ? String(asRecord(record.test).title) : undefined,
            name: typeof asRecord(record.test).name === "string" ? String(asRecord(record.test).name) : undefined,
          }
        : null,
  };
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
    assignments: items.map(normalizeAssignmentResource),
    total,
    page,
    perPage,
    lastPage,
  };
}

function normalizeAssignment(payload: unknown) {
  const data = unwrapData(payload);
  const record = asRecord(data);
  return normalizeAssignmentResource(record.assignment ?? data);
}

function normalizeCreate(payload: unknown): AssignmentCreateResult {
  const data = unwrapData(payload);
  const record = asRecord(data);

  return {
    assignment: normalizeAssignmentResource(record.assignment ?? data),
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
      assignee_id: params.assignee_id || params.user_id || undefined,
      assigned_by_id: params.assigned_by_id || undefined,
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
