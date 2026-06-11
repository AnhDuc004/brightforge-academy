import api from "@/lib/axios";

export type QuestionType = "single_choice" | "multiple_choice" | "short_answer" | "essay" | "true_false";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "published" | "archived";

export type Question = {
  id: string;
  tenant_id?: string | null;
  created_by?: string | null;
  type: QuestionType;
  content: string;
  options: string[];
  correct_answer: string[];
  max_score: number;
  difficulty: QuestionDifficulty;
  tags: string[];
  status: QuestionStatus;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuestionPayload = {
  type: QuestionType;
  content: string;
  options: string[];
  correct_answer: string[];
  max_score: number;
  difficulty: QuestionDifficulty;
  tags: string[];
};

export type QuestionListParams = {
  page?: number;
  per_page?: number;
  status?: QuestionStatus | "all";
  tags?: string[];
};

export type QuestionListResult = {
  questions: Question[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function unwrapData(payload: unknown) {
  const record = asRecord(payload);
  return record.data ?? payload;
}

function normalizeList(payload: unknown, fallback: Required<Pick<QuestionListParams, "page" | "per_page">>): QuestionListResult {
  const data = unwrapData(payload);
  const record = asRecord(data);
  const nestedQuestions = asRecord(record.questions);
  const items =
    (Array.isArray(record.questions) && record.questions) ||
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(nestedQuestions.data) && nestedQuestions.data) ||
    [];

  const meta = asRecord(record.meta ?? record.pagination ?? nestedQuestions.meta ?? nestedQuestions);
  const total = Number(meta.total ?? record.total ?? items.length);
  const page = Number(meta.current_page ?? meta.page ?? record.current_page ?? fallback.page);
  const perPage = Number(meta.per_page ?? meta.perPage ?? record.per_page ?? fallback.per_page);
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? record.last_page ?? Math.max(1, Math.ceil(total / perPage)));

  return {
    questions: items as Question[],
    total,
    page,
    perPage,
    lastPage,
  };
}

function normalizeQuestion(payload: unknown) {
  return unwrapData(payload) as Question;
}

export async function listQuestions(params: QuestionListParams = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 10;

  if (params.status && params.status !== "all") {
    return listQuestionsByStatus(params.status, { page, per_page });
  }

  if (params.tags?.length) {
    return listQuestionsByTags(params.tags, { page, per_page });
  }

  const response = await api.get("/v1/questions", {
    params: { page, per_page },
  });

  return normalizeList(response.data, { page, per_page });
}

export async function listQuestionsByStatus(
  status: QuestionStatus,
  params: Pick<QuestionListParams, "page" | "per_page"> = {},
) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 10;
  const response = await api.get(`/v1/questions/by-status/${status}`, {
    params: { page, per_page },
  });

  return normalizeList(response.data, { page, per_page });
}

export async function listQuestionsByTags(
  tags: string[],
  params: Pick<QuestionListParams, "page" | "per_page"> = {},
) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 10;
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  tags.forEach((tag) => {
    if (tag.trim()) searchParams.append("tags[]", tag.trim());
  });

  const response = await api.get(`/v1/questions/by-tags?${searchParams.toString()}`);
  return normalizeList(response.data, { page, per_page });
}

export async function createQuestion(payload: QuestionPayload) {
  const response = await api.post("/v1/questions", payload);
  return normalizeQuestion(response.data);
}

export async function getQuestion(id: string) {
  const response = await api.get(`/v1/questions/${id}`);
  return normalizeQuestion(response.data);
}

export async function updateQuestion(id: string, payload: QuestionPayload) {
  const response = await api.put(`/v1/questions/${id}`, payload);
  return normalizeQuestion(response.data);
}

export async function deleteQuestion(id: string) {
  await api.delete(`/v1/questions/${id}`);
}

export async function publishQuestion(id: string) {
  const response = await api.post(`/v1/questions/${id}/publish`);
  return normalizeQuestion(response.data);
}

export async function archiveQuestion(id: string) {
  const response = await api.post(`/v1/questions/${id}/archive`);
  return normalizeQuestion(response.data);
}
