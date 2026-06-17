import api from "@/lib/axios";
import { normalizeAttempt, type AttemptAnswer, type AttemptResource } from "@/lib/attempts";

export type PendingGradingResult = {
  attempts: AttemptResource[];
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

function normalizePending(payload: unknown, fallback: { page: number; per_page: number }): PendingGradingResult {
  const data = unwrapData(payload);
  const record = asRecord(data);
  const nested = asRecord(record.attempts);
  const items =
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(record.attempts) && record.attempts) ||
    (Array.isArray(nested.data) && nested.data) ||
    [];
  const pagination = asRecord(record.pagination ?? record.meta ?? nested.pagination ?? nested.meta ?? nested);
  const total = Number(pagination.total ?? record.total ?? items.length);
  const perPage = Number(pagination.per_page ?? pagination.perPage ?? record.per_page ?? fallback.per_page);

  return {
    attempts: items.map(normalizeAttempt),
    total,
    page: Number(pagination.current_page ?? pagination.page ?? record.current_page ?? fallback.page),
    perPage,
    lastPage: Number(pagination.last_page ?? pagination.lastPage ?? record.last_page ?? Math.max(1, Math.ceil(total / perPage))),
  };
}

function normalizeAnswer(payload: unknown): AttemptAnswer {
  const data = unwrapData(payload);
  const record = asRecord(data);

  return {
    id: String(record.id ?? ""),
    attempt_id: String(record.attempt_id ?? ""),
    test_section_question_id: String(record.test_section_question_id ?? ""),
    response: record.response && typeof record.response === "object" ? (record.response as Record<string, unknown>) : null,
    review_status: typeof record.review_status === "string" ? record.review_status : null,
    auto_score: typeof record.auto_score === "number" ? record.auto_score : null,
    manual_score: typeof record.manual_score === "number" ? record.manual_score : null,
    reviewer_feedback: typeof record.reviewer_feedback === "string" ? record.reviewer_feedback : null,
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

export async function listPendingGrading(params: { page?: number; per_page?: number } = {}) {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 20;
  const response = await api.get("/v1/grading/pending", {
    params: { page, per_page },
  });

  return normalizePending(response.data, { page, per_page });
}

export async function reviewAnswer(
  answerId: string,
  payload: { manual_score: number; reviewer_feedback?: string | null },
) {
  const response = await api.put(`/v1/answers/${answerId}/review`, payload);
  return normalizeAnswer(response.data);
}

export async function finalizeAttempt(attemptId: string) {
  const response = await api.post(`/v1/grading/attempts/${attemptId}/finalize`);
  return normalizeAttempt(response.data);
}
