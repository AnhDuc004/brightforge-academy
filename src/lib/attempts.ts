import api from "@/lib/axios";

export type AttemptStatus = "in_progress" | "expired" | "submitted";

export type AttemptAnswer = {
  id: string;
  attempt_id: string;
  test_section_question_id: string;
  response: Record<string, unknown> | null;
  review_status?: string | null;
  auto_score?: number | null;
  manual_score?: number | null;
  reviewer_feedback?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AttemptQuestion = {
  id: string;
  section_id?: string;
  question_id?: string;
  position: number;
  score_override?: number | null;
  question: {
    id?: string;
    type: "multiple_choice" | "short_answer" | "essay" | "true_false" | string;
    content: string;
    options: AttemptQuestionOption[];
    max_score: number;
    difficulty?: string;
    tags?: string[];
  };
};

export type AttemptQuestionOption = {
  label: string;
  value: string;
};

export type AttemptSection = {
  id: string;
  title: string;
  instructions?: string | null;
  position: number;
  questions: AttemptQuestion[];
};

export type AttemptResource = {
  id: string;
  assignment_id: string;
  assignee_id: string;
  started_at: string | null;
  submitted_at: string | null;
  expires_at: string | null;
  status: AttemptStatus;
  assignment?: unknown;
  test: {
    id?: string;
    title: string;
    duration_seconds?: number;
    sections: AttemptSection[];
  } | null;
  answers: AttemptAnswer[];
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function unwrapData(payload: unknown) {
  const record = asRecord(payload);
  return record.data ?? payload;
}

function normalizeQuestion(value: unknown): AttemptQuestion {
  const record = asRecord(value);
  const snapshot = asRecord(record.question_snapshot ?? record.question ?? value);

  return {
    id: String(record.id ?? ""),
    section_id: typeof record.section_id === "string" ? record.section_id : undefined,
    question_id: typeof record.question_id === "string" ? record.question_id : undefined,
    position: Number(record.position ?? 0),
    score_override: typeof record.score_override === "number" ? record.score_override : null,
    question: {
      id: typeof snapshot.id === "string" ? snapshot.id : undefined,
      type: String(snapshot.type ?? ""),
      content: String(snapshot.content ?? ""),
      options: Array.isArray(snapshot.options) ? snapshot.options.map(normalizeOption) : [],
      max_score: Number(record.score_override ?? snapshot.max_score ?? 0),
      difficulty: typeof snapshot.difficulty === "string" ? snapshot.difficulty : undefined,
      tags: Array.isArray(snapshot.tags) ? (snapshot.tags as string[]) : [],
    },
  };
}

function normalizeOption(value: unknown, index: number): AttemptQuestionOption {
  if (typeof value === "string") {
    return { label: value, value };
  }

  const record = asRecord(value);
  const label = record.label ?? record.text ?? record.name ?? record.value ?? String.fromCharCode(65 + index);
  const optionValue = record.value ?? record.id ?? record.key ?? label;

  return {
    label: String(label),
    value: String(optionValue),
  };
}

function normalizeSection(value: unknown): AttemptSection {
  const record = asRecord(value);

  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? "Section"),
    instructions: typeof record.instructions === "string" ? record.instructions : null,
    position: Number(record.position ?? 0),
    questions: Array.isArray(record.questions)
      ? record.questions.map(normalizeQuestion).sort((a, b) => a.position - b.position)
      : [],
  };
}

function normalizeAnswer(value: unknown): AttemptAnswer {
  const record = asRecord(value);

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

export function normalizeAttempt(payload: unknown): AttemptResource {
  const data = unwrapData(payload);
  const record = asRecord(data);
  const test = asRecord(record.test);

  return {
    id: String(record.id ?? ""),
    assignment_id: String(record.assignment_id ?? ""),
    assignee_id: String(record.assignee_id ?? ""),
    started_at: typeof record.started_at === "string" ? record.started_at : null,
    submitted_at: typeof record.submitted_at === "string" ? record.submitted_at : null,
    expires_at: typeof record.expires_at === "string" ? record.expires_at : null,
    status: (record.status as AttemptStatus) ?? "in_progress",
    assignment: record.assignment,
    test: record.test
      ? {
          id: typeof test.id === "string" ? test.id : undefined,
          title: String(test.title ?? "Exam"),
          duration_seconds: typeof test.duration_seconds === "number" ? test.duration_seconds : undefined,
          sections: Array.isArray(test.sections)
            ? test.sections.map(normalizeSection).sort((a, b) => a.position - b.position)
            : [],
        }
      : null,
    answers: Array.isArray(record.answers) ? record.answers.map(normalizeAnswer) : [],
  };
}

export function flattenAttemptQuestions(attempt: AttemptResource | null | undefined) {
  return attempt?.test?.sections.flatMap((section) =>
    section.questions.map((question) => ({
      ...question,
      section,
    })),
  ) ?? [];
}

export async function getAttempt(id: string) {
  const response = await api.get(`/v1/attempts/${id}`);
  return normalizeAttempt(response.data);
}

export async function saveAttemptAnswer(
  attemptId: string,
  payload: { test_section_question_id: string; response: Record<string, unknown> | null },
) {
  const response = await api.post(`/v1/attempts/${attemptId}/answers`, payload);
  return normalizeAnswer(unwrapData(response.data));
}

export async function submitAttempt(id: string) {
  const response = await api.post(`/v1/attempts/${id}/submit`);
  return normalizeAttempt(response.data);
}
