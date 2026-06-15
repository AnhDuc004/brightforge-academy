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

export type TestStatus = "draft" | "published";

export type TestCreator = {
  id: string;
  email: string;
  display_name: string;
};

export type TestQuestionSnapshot = {
  id: string;
  type: string;
  content: string;
  options: string[];
  correct_answer: string[];
  max_score: number;
  difficulty: string;
  tags: string[];
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestSectionQuestion = {
  id: string;
  section_id: string;
  question_id: string;
  position: number;
  score_override?: number | null;
  question_snapshot: TestQuestionSnapshot;
};

export type TestSection = {
  id: string;
  test_id: string;
  title: string;
  instructions?: string | null;
  position: number;
  questions: TestSectionQuestion[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestResource = {
  id: string;
  tenant_id?: string | null;
  created_by?: string | null;
  title: string;
  description?: string | null;
  duration_seconds: number;
  passing_score: number;
  status: TestStatus;
  published_at?: string | null;
  creator?: TestCreator | null;
  sections: TestSection[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestListParams = {
  page?: number;
  per_page?: number;
  status?: TestStatus;
};

export type TestListResult = {
  tests: TestResource[];
  total: number;
  count: number;
  page: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
};

export type TestPayload = {
  title: string;
  description?: string | null;
  duration_seconds: number;
  passing_score: number;
  sections?: TestSectionPayload[];
};

export type TestSectionPayload = {
  title: string;
  instructions?: string | null;
  position: number;
  questions?: TestSectionQuestionPayload[];
};

export type TestSectionQuestionPayload = {
  question_id: string;
  position: number;
  score_override?: number | null;
};

export type TestSectionUpdatePayload = {
  title?: string;
  instructions?: string | null;
  position?: number;
};

export type TestSectionQuestionUpdatePayload = {
  position?: number;
  score_override?: number | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumberOrNull(value: unknown) {
  return typeof value === "number" ? value : null;
}

function unwrapData(payload: unknown) {
  const record = asRecord(payload);
  return record.data ?? payload;
}

function normalizeQuestionSnapshot(value: unknown): TestQuestionSnapshot {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    type: String(record.type ?? ""),
    content: String(record.content ?? ""),
    options: Array.isArray(record.options) ? (record.options as string[]) : [],
    correct_answer: Array.isArray(record.correct_answer) ? (record.correct_answer as string[]) : [],
    max_score: Number(record.max_score ?? 0),
    difficulty: String(record.difficulty ?? ""),
    tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
    status: String(record.status ?? ""),
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

function normalizeSectionQuestion(value: unknown): TestSectionQuestion {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    section_id: String(record.section_id ?? ""),
    question_id: String(record.question_id ?? ""),
    position: Number(record.position ?? 0),
    score_override: asNumberOrNull(record.score_override),
    question_snapshot: normalizeQuestionSnapshot(record.question_snapshot),
  };
}

function normalizeSection(value: unknown): TestSection {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    test_id: String(record.test_id ?? ""),
    title: String(record.title ?? ""),
    instructions: typeof record.instructions === "string" ? record.instructions : null,
    position: Number(record.position ?? 0),
    questions: Array.isArray(record.questions) ? record.questions.map(normalizeSectionQuestion) : [],
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

function normalizeTest(value: unknown): TestResource {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    tenant_id: typeof record.tenant_id === "string" ? record.tenant_id : null,
    created_by: typeof record.created_by === "string" ? record.created_by : null,
    title: String(record.title ?? ""),
    description: typeof record.description === "string" ? record.description : null,
    duration_seconds: Number(record.duration_seconds ?? 0),
    passing_score: Number(record.passing_score ?? 0),
    status: (record.status as TestStatus) ?? "draft",
    published_at: typeof record.published_at === "string" ? record.published_at : null,
    creator: record.creator && typeof record.creator === "object"
      ? {
          id: String(asRecord(record.creator).id ?? ""),
          email: String(asRecord(record.creator).email ?? ""),
          display_name: String(asRecord(record.creator).display_name ?? ""),
        }
      : null,
    sections: Array.isArray(record.sections) ? record.sections.map(normalizeSection) : [],
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

function normalizeList(payload: unknown, fallback: Required<Pick<TestListParams, "page" | "per_page">>): TestListResult {
  const data = unwrapData(payload);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const items =
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(record.tests) && record.tests) ||
    (Array.isArray(nested.data) && nested.data) ||
    [];

  const meta = asRecord(record.pagination ?? record.meta ?? nested.pagination ?? nested.meta);
  const total = Number(meta.total ?? record.total ?? items.length);
  const count = Number(meta.count ?? record.count ?? items.length);
  const page = Number(meta.current_page ?? meta.page ?? record.current_page ?? fallback.page);
  const perPage = Number(meta.per_page ?? meta.perPage ?? record.per_page ?? fallback.per_page);
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? record.last_page ?? Math.max(1, Math.ceil(total / perPage)));

  return {
    tests: items.map(normalizeTest),
    total,
    count,
    page,
    perPage,
    lastPage,
    from: asNumberOrNull(meta.from),
    to: asNumberOrNull(meta.to),
  };
}

function normalizeSingle(payload: unknown) {
  const data = unwrapData(payload);
  const record = asRecord(data);
  return normalizeTest(record.test ?? data);
}

function normalizeCreate(payload: unknown): TestResource {
  const data = unwrapData(payload);
  const record = asRecord(data);
  return normalizeTest(record.test ?? data);
}

function normalizePayloadQuestions(questions?: TestSectionQuestionPayload[]) {
  return questions?.map((question) => ({
    question_id: question.question_id,
    position: question.position,
    score_override: question.score_override ?? null,
  }));
}

export async function listTests(params: TestListParams = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 10;
  const response = await api.get<ApiEnvelope<unknown>>("/v1/tests", {
    params: {
      page,
      per_page,
      ...(params.status ? { status: params.status } : {}),
    },
  });

  return normalizeList(response.data, { page, per_page });
}

export async function listAllTests(params: Omit<TestListParams, "page"> = {}) {
  const firstPage = await listTests({ ...params, page: 1, per_page: params.per_page ?? 50 });
  if (firstPage.lastPage <= 1) return firstPage.tests;

  const pages = await Promise.all(
    Array.from({ length: firstPage.lastPage - 1 }, (_, index) =>
      listTests({ ...params, page: index + 2, per_page: firstPage.perPage }),
    ),
  );

  return [firstPage.tests, ...pages.map((page) => page.tests)].flat();
}

export async function getTest(id: string) {
  const response = await api.get<ApiEnvelope<unknown>>(`/v1/tests/${id}`);
  return normalizeSingle(response.data);
}

export async function createTest(payload: TestPayload) {
  const response = await api.post<ApiEnvelope<unknown>>("/v1/tests", {
    ...payload,
    sections: payload.sections?.map((section) => ({
      title: section.title,
      instructions: section.instructions ?? null,
      position: section.position,
      questions: normalizePayloadQuestions(section.questions),
    })),
  });

  return normalizeCreate(response.data);
}

export async function updateTest(id: string, payload: Partial<TestPayload>) {
  const response = await api.put<ApiEnvelope<unknown>>(`/v1/tests/${id}`, payload);
  return normalizeCreate(response.data);
}

export async function deleteTest(id: string) {
  await api.delete(`/v1/tests/${id}`);
}

export async function publishTest(id: string) {
  const response = await api.post<ApiEnvelope<unknown>>(`/v1/tests/${id}/publish`);
  return normalizeCreate(response.data);
}

export async function addSection(testId: string, payload: TestSectionPayload) {
  const response = await api.post<ApiEnvelope<unknown>>(`/v1/tests/${testId}/sections`, {
    title: payload.title,
    instructions: payload.instructions ?? null,
    position: payload.position,
    questions: normalizePayloadQuestions(payload.questions),
  });

  return normalizeSingle(response.data);
}

export async function updateSection(testId: string, sectionId: string, payload: TestSectionUpdatePayload) {
  const response = await api.put<ApiEnvelope<unknown>>(`/v1/tests/${testId}/sections/${sectionId}`, payload);
  return normalizeSingle(response.data);
}

export async function deleteSection(testId: string, sectionId: string) {
  await api.delete(`/v1/tests/${testId}/sections/${sectionId}`);
}

export async function attachQuestionToSection(
  testId: string,
  sectionId: string,
  payload: TestSectionQuestionPayload,
) {
  const response = await api.post<ApiEnvelope<unknown>>(`/v1/tests/${testId}/sections/${sectionId}/questions`, {
    question_id: payload.question_id,
    position: payload.position,
    score_override: payload.score_override ?? null,
  });

  return normalizeSingle(response.data);
}

export async function updateSectionQuestion(
  testId: string,
  sectionId: string,
  sectionQuestionId: string,
  payload: TestSectionQuestionUpdatePayload,
) {
  const response = await api.put<ApiEnvelope<unknown>>(
    `/v1/tests/${testId}/sections/${sectionId}/questions/${sectionQuestionId}`,
    payload,
  );
  return normalizeSingle(response.data);
}

export async function removeQuestionFromSection(testId: string, sectionId: string, sectionQuestionId: string) {
  await api.delete(`/v1/tests/${testId}/sections/${sectionId}/questions/${sectionQuestionId}`);
}
