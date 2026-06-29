import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GripVertical,
  Plus,
  Search,
  Trash2,
  Save,
  Send,
  FileText,
  Lock,
  Loader2,
  Pencil,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { listAllQuestions, type Question } from "@/lib/questions";
import {
  addSection,
  attachQuestionToSection,
  createTest,
  deleteSection,
  getTest,
  publishTest,
  removeQuestionFromSection,
  updateSection,
  updateSectionQuestion,
  updateTest,
  type TestResource,
} from "@/lib/tests";
import { parseApiError } from "@/lib/auth";

export const Route = createFileRoute("/tests/builder")({
  validateSearch: z.object({
    testId: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Trình tạo bài kiểm tra · ExamForge" }] }),
  component: TestBuilder,
});

type TestFormState = {
  title: string;
  description: string;
  duration_seconds: string;
  passing_score: string;
};

type SectionFormState = {
  title: string;
  instructions: string;
  position: string;
};

type QuestionFormState = {
  position: string;
  score_override: string;
};

type AttachFormState = {
  question_id: string;
  position: string;
  score_override: string;
};

type FieldErrors = Partial<Record<"title" | "description" | "duration_seconds" | "passing_score", string>>;
type SectionFieldErrors = Record<string, Partial<Record<"title" | "instructions" | "position", string>>>;
type QuestionFieldErrors = Record<string, Partial<Record<"position" | "score_override", string>>>;
type AttachFieldErrors = Record<string, Partial<Record<"question_id" | "position" | "score_override", string>>>;

const emptyTestForm: TestFormState = {
  title: "",
  description: "",
  duration_seconds: "3600",
  passing_score: "70",
};

function toTestForm(test?: TestResource | null): TestFormState {
  if (!test) return emptyTestForm;

  return {
    title: test.title,
    description: test.description ?? "",
    duration_seconds: String(test.duration_seconds || 3600),
    passing_score: String(test.passing_score || 70),
  };
}

function toSectionForm(section: TestResource["sections"][number]): SectionFormState {
  return {
    title: section.title,
    instructions: section.instructions ?? "",
    position: String(section.position),
  };
}

function toQuestionForm(question: TestResource["sections"][number]["questions"][number]): QuestionFormState {
  return {
    position: String(question.position),
    score_override: question.score_override == null ? "" : String(question.score_override),
  };
}

function toNum(value: string) {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function firstErrorMessage(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

const testSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc."),
  description: z.string().trim().optional().nullable(),
  duration_seconds: z.coerce.number().int("Thời lượng phải là số nguyên.").min(1, "Thời lượng phải ít nhất 1 giây."),
  passing_score: z.coerce.number().int("Điểm đạt phải là số nguyên.").min(0, "Điểm đạt phải lớn hơn hoặc bằng 0."),
});

const sectionSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề phần là bắt buộc."),
  instructions: z.string().trim().optional().nullable(),
  position: z.coerce.number().int("Vị trí phải là số nguyên.").min(1, "Vị trí phải ít nhất là 1."),
});

const questionSchema = z.object({
  position: z.coerce.number().int("Vị trí phải là số nguyên.").min(1, "Vị trí phải ít nhất là 1."),
  score_override: z.coerce.number().int("Điểm phải là số nguyên.").min(0, "Điểm phải lớn hơn hoặc bằng 0.").nullable(),
});

const attachSchema = z.object({
  question_id: z.string().trim().min(1, "Vui lòng chọn một câu hỏi."),
  position: z.coerce.number().int("Vị trí phải là số nguyên.").min(1, "Vị trí phải ít nhất là 1."),
  score_override: z.coerce.number().int("Điểm phải là số nguyên.").min(0, "Điểm phải lớn hơn hoặc bằng 0.").nullable(),
});

function TestBuilder() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { testId } = Route.useSearch();
  const [bankSearch, setBankSearch] = useState("");
  const [testForm, setTestForm] = useState<TestFormState>(emptyTestForm);
  const [sectionForms, setSectionForms] = useState<Record<string, SectionFormState>>({});
  const [questionForms, setQuestionForms] = useState<Record<string, QuestionFormState>>({});
  const [attachForms, setAttachForms] = useState<Record<string, AttachFormState>>({});
  const [testErrors, setTestErrors] = useState<FieldErrors>({});
  const [sectionErrors, setSectionErrors] = useState<SectionFieldErrors>({});
  const [questionErrors, setQuestionErrors] = useState<QuestionFieldErrors>({});
  const [attachErrors, setAttachErrors] = useState<AttachFieldErrors>({});
  const [newSectionForm, setNewSectionForm] = useState<SectionFormState>({
    title: "",
    instructions: "",
    position: "1",
  });
  const [newSectionErrors, setNewSectionErrors] = useState<Partial<Record<"title" | "instructions" | "position", string>>>({});

  const testQuery = useQuery({
    queryKey: ["tests", "detail", testId],
    queryFn: () => getTest(testId ?? ""),
    enabled: Boolean(testId),
    staleTime: 30_000,
  });

  const publishedQuestionsQuery = useQuery({
    queryKey: ["questions", "published", "bank"],
    queryFn: () => listAllQuestions({ status: "published", per_page: 100 }),
    staleTime: 30_000,
  });

  useEffect(() => {
    const test = testQuery.data;
    setTestForm(toTestForm(test));
    setTestErrors({});
    setSectionForms(
      Object.fromEntries((test?.sections ?? []).map((section) => [section.id, toSectionForm(section)])),
    );
    setSectionErrors({});
    setQuestionForms(
      Object.fromEntries(
        (test?.sections ?? []).flatMap((section) =>
          section.questions.map((question) => [question.id, toQuestionForm(question)]),
        ),
      ),
    );
    setQuestionErrors({});
    setAttachForms(
      Object.fromEntries(
        (test?.sections ?? []).map((section) => [
          section.id,
          {
            question_id: "",
            position: String(section.questions.length + 1),
            score_override: "",
          },
        ]),
      ),
    );
    setAttachErrors({});
    setNewSectionForm({
      title: "",
      instructions: "",
      position: String((test?.sections?.length ?? 0) + 1),
    });
    setNewSectionErrors({});
  }, [testQuery.data]);

  const bankQuestions = publishedQuestionsQuery.data ?? [];
  const filteredBankQuestions = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return bankQuestions;

    return bankQuestions.filter((question) =>
      [
        question.content,
        question.type,
        question.difficulty,
        question.tags.join(" "),
        question.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [bankQuestions, bankSearch]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tests"] });
    if (testId) {
      await queryClient.invalidateQueries({ queryKey: ["tests", "detail", testId] });
    }
  };

  function validateTestForm() {
    const parsed = testSchema.safeParse({
      title: testForm.title,
      description: testForm.description || null,
      duration_seconds: testForm.duration_seconds,
      passing_score: testForm.passing_score,
    });

    if (parsed.success) {
      setTestErrors({});
      return parsed.data;
    }

    setTestErrors(firstErrorMessage(parsed.error) as FieldErrors);
    return null;
  }

  function validateSectionForm(sectionId: string, payload: SectionFormState) {
    const parsed = sectionSchema.safeParse({
      title: payload.title,
      instructions: payload.instructions || null,
      position: payload.position,
    });

    if (parsed.success) {
      setSectionErrors((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
      return parsed.data;
    }

    setSectionErrors((current) => ({
      ...current,
      [sectionId]: firstErrorMessage(parsed.error) as SectionFieldErrors[string],
    }));
    return null;
  }

  function validateQuestionForm(questionId: string, payload: QuestionFormState) {
    const parsed = questionSchema.safeParse({
      position: payload.position,
      score_override: payload.score_override === "" ? null : payload.score_override,
    });

    if (parsed.success) {
      setQuestionErrors((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      return parsed.data;
    }

    setQuestionErrors((current) => ({
      ...current,
      [questionId]: firstErrorMessage(parsed.error) as QuestionFieldErrors[string],
    }));
    return null;
  }

  function validateAttachForm(sectionId: string, payload: AttachFormState) {
    const parsed = attachSchema.safeParse({
      question_id: payload.question_id,
      position: payload.position,
      score_override: payload.score_override === "" ? null : payload.score_override,
    });

    if (parsed.success) {
      setAttachErrors((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
      return parsed.data;
    }

    setAttachErrors((current) => ({
      ...current,
      [sectionId]: firstErrorMessage(parsed.error) as AttachFieldErrors[string],
    }));
    return null;
  }

  const saveTestMutation = useMutation({
    mutationFn: async () => {
      const payload = validateTestForm();
      if (!payload) {
        throw new Error("Vui lòng sửa các trường được đánh dấu.");
      }

      if (testId) {
        return updateTest(testId, payload);
      }

      return createTest(payload);
    },
    onSuccess: async (saved) => {
      toast.success(testId ? "Đã cập nhật bài kiểm tra thành công." : "Đã tạo bài kiểm tra thành công.");
      await refresh();
      if (!testId && saved?.id) {
        await router.navigate({
          to: "/tests/builder",
          search: { testId: saved.id },
        });
      }
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTest(testId ?? ""),
    onSuccess: async () => {
      toast.success("Đã xuất bản bài kiểm tra thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async () => {
      if (!testId) throw new Error("Please save the test first.");
      const parsed = sectionSchema.safeParse({
        title: newSectionForm.title,
        instructions: newSectionForm.instructions || null,
        position: newSectionForm.position,
      });
      if (!parsed.success) {
        setNewSectionErrors(firstErrorMessage(parsed.error) as Partial<Record<"title" | "instructions" | "position", string>>);
        throw new Error("Vui lòng sửa các trường được đánh dấu.");
      }
      setNewSectionErrors({});
      return addSection(testId, {
        title: parsed.data.title,
        instructions: parsed.data.instructions,
        position: parsed.data.position,
      });
    },
    onSuccess: async () => {
      toast.success("Đã thêm phần thành công.");
      setNewSectionForm((current) => ({
        ...current,
        title: "",
        instructions: "",
        position: String((testQuery.data?.sections?.length ?? 0) + 1),
      }));
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ sectionId, payload }: { sectionId: string; payload: SectionFormState }) => {
      if (!testId) throw new Error("Thiếu ID bài kiểm tra.");
      const parsed = validateSectionForm(sectionId, payload);
      if (!parsed) {
        throw new Error("Vui lòng sửa các trường được đánh dấu.");
      }
      return updateSection(testId, sectionId, {
        title: parsed.title,
        instructions: parsed.instructions,
        position: parsed.position,
      });
    },
    onSuccess: async () => {
      toast.success("Đã cập nhật phần thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      if (!testId) throw new Error("Thiếu ID bài kiểm tra.");
      return deleteSection(testId, sectionId);
    },
    onSuccess: async () => {
      toast.success("Đã xóa phần thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const attachQuestionMutation = useMutation({
    mutationFn: async ({ sectionId, payload }: { sectionId: string; payload: AttachFormState }) => {
      if (!testId) throw new Error("Thiếu ID bài kiểm tra.");
      const parsed = validateAttachForm(sectionId, payload);
      if (!parsed) {
        throw new Error("Vui lòng sửa các trường được đánh dấu.");
      }
      return attachQuestionToSection(testId, sectionId, {
        question_id: parsed.question_id,
        position: parsed.position,
        score_override: parsed.score_override,
      });
    },
    onSuccess: async () => {
      toast.success("Đã gắn câu hỏi thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({
      sectionId,
      sectionQuestionId,
      payload,
    }: {
      sectionId: string;
      sectionQuestionId: string;
      payload: QuestionFormState;
    }) => {
      if (!testId) throw new Error("Thiếu ID bài kiểm tra.");
      const parsed = validateQuestionForm(sectionQuestionId, payload);
      if (!parsed) {
        throw new Error("Vui lòng sửa các trường được đánh dấu.");
      }
      return updateSectionQuestion(testId, sectionId, sectionQuestionId, {
        position: parsed.position,
        score_override: parsed.score_override,
      });
    },
    onSuccess: async () => {
      toast.success("Đã cập nhật câu hỏi thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async ({ sectionId, sectionQuestionId }: { sectionId: string; sectionQuestionId: string }) => {
      if (!testId) throw new Error("Thiếu ID bài kiểm tra.");
      return removeQuestionFromSection(testId, sectionId, sectionQuestionId);
    },
    onSuccess: async () => {
      toast.success("Đã xóa câu hỏi khỏi phần thành công.");
      await refresh();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  async function moveSection(sectionId: string, direction: "up" | "down") {
    if (!testId || isReadOnly) return;

    const ordered = [...sections];
    const index = ordered.findIndex((section) => section.id === sectionId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index];
    const target = ordered[targetIndex];

    try {
      await Promise.all([
        updateSection(testId, current.id, { position: target.position }),
        updateSection(testId, target.id, { position: current.position }),
      ]);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function moveQuestion(sectionId: string, questionId: string, direction: "up" | "down") {
    if (!testId || isReadOnly) return;

    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;

    const ordered = [...section.questions].sort((left, right) => left.position - right.position);
    const index = ordered.findIndex((question) => question.id === questionId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index];
    const target = ordered[targetIndex];

    try {
      await Promise.all([
        updateSectionQuestion(testId, sectionId, current.id, { position: target.position }),
        updateSectionQuestion(testId, sectionId, target.id, { position: current.position }),
      ]);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  const test = testQuery.data;
  const isReadOnly = test?.status === "published";
  const sections = useMemo(
    () => [...(test?.sections ?? [])].sort((left, right) => left.position - right.position),
    [test?.sections],
  );

  const publishedQuestions = publishedQuestionsQuery.isLoading ? [] : filteredBankQuestions;
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);

  return (
    <AppLayout
      breadcrumbs={[{ label: "Bài kiểm tra", to: "/tests" }, { label: "Trình tạo" }]}
      title={test?.title ?? "Bài kiểm tra mới"}
      description={
        test
          ? isReadOnly
            ? "Bài kiểm tra đã xuất bản. Chỉ đọc sau khi xuất bản."
            : "Bài kiểm tra bản nháp. Chỉnh sửa siêu dữ liệu, phần và ánh xạ câu hỏi tại đây."
          : "Tạo một bài kiểm tra nháp mới, sau đó thêm phần và câu hỏi từ ngân hàng câu hỏi đã xuất bản."
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void saveTestMutation.mutateAsync()}
            disabled={saveTestMutation.isPending}
          >
            {saveTestMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-1.5">{testId ? "Lưu bản nháp" : "Tạo bản nháp"}</span>
          </Button>
          {testId && !isReadOnly && (
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => void publishMutation.mutateAsync()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-1.5">Xuất bản</span>
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)] overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" /> Ngân hàng câu hỏi
              </h3>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {bankQuestions.length}
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={bankSearch}
                onChange={(event) => setBankSearch(event.target.value)}
                placeholder="Tìm câu hỏi đã xuất bản..."
                className="pl-8 h-9"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Chỉ câu hỏi đã xuất bản mới có thể được gắn vào bài kiểm tra.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {publishedQuestionsQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Đang tải ngân hàng câu hỏi...</div>
            ) : publishedQuestions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Không có câu hỏi đã xuất bản nào khớp với tìm kiếm của bạn.</div>
            ) : (
              publishedQuestions.map((question: Question) => (
                <div
                  key={question.id}
                  className="group flex items-start gap-2 p-2.5 rounded-md border bg-background hover:border-brand/40 hover:bg-brand/5 transition"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{question.content}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {question.type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{question.difficulty}</span>
                      <span className="text-[11px] text-muted-foreground font-mono ml-auto">{question.id}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tiêu đề</label>
                <Input
                  value={testForm.title}
                  onChange={(event) => {
                    setTestForm((current) => ({ ...current, title: event.target.value }));
                    setTestErrors((current) => ({ ...current, title: undefined }));
                  }}
                  placeholder="Giữa kỳ môn tiếng Anh"
                  className={testErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {testErrors.title && <p className="text-xs text-destructive">{testErrors.title}</p>}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Điểm đạt</label>
                <Input
                  type="number"
                  min="0"
                  value={testForm.passing_score}
                  onChange={(event) => {
                    setTestForm((current) => ({ ...current, passing_score: event.target.value }));
                    setTestErrors((current) => ({ ...current, passing_score: undefined }));
                  }}
                  className={testErrors.passing_score ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {testErrors.passing_score && <p className="text-xs text-destructive">{testErrors.passing_score}</p>}
              </div>
              <div className="grid gap-2 md:col-span-2">
                <label className="text-sm font-medium">Mô tả</label>
                <Textarea
                  value={testForm.description}
                  onChange={(event) => {
                    setTestForm((current) => ({ ...current, description: event.target.value }));
                    setTestErrors((current) => ({ ...current, description: undefined }));
                  }}
                  placeholder="Bài kiểm tra giữa kỳ"
                  className={`min-h-24 ${testErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {testErrors.description && <p className="text-xs text-destructive">{testErrors.description}</p>}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Thời lượng tính bằng giây</label>
                <Input
                  type="number"
                  min="1"
                  value={testForm.duration_seconds}
                  onChange={(event) => {
                    setTestForm((current) => ({ ...current, duration_seconds: event.target.value }));
                    setTestErrors((current) => ({ ...current, duration_seconds: undefined }));
                  }}
                  className={testErrors.duration_seconds ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {testErrors.duration_seconds && <p className="text-xs text-destructive">{testErrors.duration_seconds}</p>}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Việc xuất bản sẽ cố định ảnh chụp của mọi câu hỏi trong từng phần.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void saveTestMutation.mutateAsync()}
                  disabled={saveTestMutation.isPending}
                >
                  {saveTestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">{testId ? "Lưu siêu dữ liệu" : "Tạo bài kiểm tra"}</span>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Tổng số phần" value={String(test?.sections.length ?? 0)} />
              <Stat label="Tổng số câu hỏi" value={String(totalQuestions)} />
              <Stat label="Thời lượng" value={`${Math.max(1, Math.round(Number(testForm.duration_seconds || 0) / 60))} phút`} />
              <Stat label="Điểm đạt" value={`${testForm.passing_score || 0}%`} />
            </div>
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-brand/10 border border-brand/30 text-xs">
              <Lock className="h-3.5 w-3.5 text-foreground" />
              <span>
                <strong>Chế độ ảnh chụp.</strong> Câu hỏi được sao chép từ ngân hàng đã xuất bản và các chỉnh sửa sau này trong ngân hàng
                sẽ không thay đổi bài kiểm tra này.
              </span>
            </div>
          </Card>

          <div className="space-y-4">
            {sections.map((section) => {
              const sectionDraft = sectionForms[section.id] ?? toSectionForm(section);
              const attachDraft = attachForms[section.id] ?? {
                question_id: "",
                position: String(section.questions.length + 1),
                score_override: "",
              };
              const sectionError = sectionErrors[section.id] ?? {};
              const sortedQuestions = [...section.questions].sort((left, right) => left.position - right.position);
              const attachError = attachErrors[section.id] ?? {};

              return (
                <Card key={section.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={sectionDraft.title}
                      onChange={(event) => {
                        setSectionForms((current) => ({
                          ...current,
                          [section.id]: { ...sectionDraft, title: event.target.value },
                        }));
                        setSectionErrors((current) => ({
                          ...current,
                          [section.id]: { ...current[section.id], title: undefined },
                        }));
                      }}
                      className="border-0 shadow-none focus-visible:ring-0 font-medium px-1 h-7 bg-transparent flex-1 min-w-[180px]"
                      disabled={isReadOnly}
                    />
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {sortedQuestions.length} câu hỏi
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isReadOnly}
                      onClick={() => void moveSection(section.id, "up")}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isReadOnly}
                      onClick={() => void moveSection(section.id, "down")}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isReadOnly || deleteSectionMutation.isPending}
                      onClick={() => void deleteSectionMutation.mutateAsync(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tiêu đề</label>
                      <Input
                        value={sectionDraft.title}
                        onChange={(event) => {
                          setSectionForms((current) => ({
                            ...current,
                            [section.id]: { ...sectionDraft, title: event.target.value },
                          }));
                          setSectionErrors((current) => ({
                            ...current,
                            [section.id]: { ...current[section.id], title: undefined },
                          }));
                        }}
                        disabled={isReadOnly}
                        className={sectionError.title ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {sectionError.title && <p className="text-xs text-destructive">{sectionError.title}</p>}
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Vị trí</label>
                      <Input
                        type="number"
                        min="1"
                        value={sectionDraft.position}
                        onChange={(event) => {
                          setSectionForms((current) => ({
                            ...current,
                            [section.id]: { ...sectionDraft, position: event.target.value },
                          }));
                          setSectionErrors((current) => ({
                            ...current,
                            [section.id]: { ...current[section.id], position: undefined },
                          }));
                        }}
                        disabled={isReadOnly}
                        className={sectionError.position ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {sectionError.position && <p className="text-xs text-destructive">{sectionError.position}</p>}
                    </div>
                    <div className="grid gap-1.5 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground">Hướng dẫn</label>
                      <Textarea
                        value={sectionDraft.instructions}
                        onChange={(event) => {
                          setSectionForms((current) => ({
                            ...current,
                            [section.id]: { ...sectionDraft, instructions: event.target.value },
                          }));
                          setSectionErrors((current) => ({
                            ...current,
                            [section.id]: { ...current[section.id], instructions: undefined },
                          }));
                        }}
                        disabled={isReadOnly}
                        className={`min-h-20 ${sectionError.instructions ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {sectionError.instructions && <p className="text-xs text-destructive">{sectionError.instructions}</p>}
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isReadOnly || updateSectionMutation.isPending}
                        onClick={() => void updateSectionMutation.mutateAsync({ sectionId: section.id, payload: sectionDraft })}
                      >
                        {updateSectionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Lưu phần</span>
                      </Button>
                    </div>
                  </div>

                  <ol className="divide-y">
                    {sortedQuestions.map((question) => {
                      const draft = questionForms[question.id] ?? toQuestionForm(question);
                      const questionError = questionErrors[question.id] ?? {};

                      return (
                        <li key={question.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                          <span className="text-xs font-mono text-muted-foreground w-6 mt-1">
                            {question.position}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium line-clamp-1">
                              {question.question_snapshot.content}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <Lock className="h-3 w-3" />
                              Snapshot · {question.question_id} · {question.question_snapshot.type}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Vị trí</span>
                            <Input
                              type="number"
                              min="1"
                              value={draft.position}
                              onChange={(event) => {
                                setQuestionForms((current) => ({
                                  ...current,
                                  [question.id]: { ...draft, position: event.target.value },
                                }));
                                setQuestionErrors((current) => ({
                                  ...current,
                                  [question.id]: { ...current[question.id], position: undefined },
                                }));
                              }}
                              className={`h-7 w-16 text-center ${questionError.position ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              disabled={isReadOnly}
                            />
                            <span className="text-muted-foreground">Điểm</span>
                            <Input
                              type="number"
                              value={draft.score_override}
                              onChange={(event) => {
                                setQuestionForms((current) => ({
                                  ...current,
                                  [question.id]: { ...draft, score_override: event.target.value },
                                }));
                                setQuestionErrors((current) => ({
                                  ...current,
                                  [question.id]: { ...current[question.id], score_override: undefined },
                                }));
                              }}
                              className={`h-7 w-16 text-center ${questionError.score_override ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              disabled={isReadOnly}
                            />
                          </div>
                          {questionError.position || questionError.score_override ? (
                            <div className="text-xs text-destructive">
                              {questionError.position ?? questionError.score_override}
                            </div>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isReadOnly}
                            onClick={() => void moveQuestion(section.id, question.id, "up")}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isReadOnly}
                            onClick={() => void moveQuestion(section.id, question.id, "down")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isReadOnly || updateQuestionMutation.isPending}
                            onClick={() =>
                              void updateQuestionMutation.mutateAsync({
                                sectionId: section.id,
                                sectionQuestionId: question.id,
                                payload: draft,
                              })
                            }
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isReadOnly || deleteQuestionMutation.isPending}
                            onClick={() =>
                              void deleteQuestionMutation.mutateAsync({
                                sectionId: section.id,
                                sectionQuestionId: question.id,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="border-t bg-muted/20 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2 grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Gắn câu hỏi</label>
                      <Select
                        value={attachDraft.question_id}
                        onValueChange={(value) =>
                          setAttachForms((current) => ({
                            ...current,
                            [section.id]: { ...attachDraft, question_id: value },
                          }))
                        }
                        disabled={isReadOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn một câu hỏi đã xuất bản" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankQuestions.map((question) => (
                            <SelectItem key={question.id} value={question.id}>
                              {question.id} · {question.content.slice(0, 50)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {attachError.question_id && <p className="text-xs text-destructive">{attachError.question_id}</p>}
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Vị trí</label>
                      <Input
                        type="number"
                        min="1"
                        value={attachDraft.position}
                        onChange={(event) => {
                          setAttachForms((current) => ({
                            ...current,
                            [section.id]: { ...attachDraft, position: event.target.value },
                          }));
                          setAttachErrors((current) => ({
                            ...current,
                            [section.id]: { ...current[section.id], position: undefined },
                          }));
                        }}
                        disabled={isReadOnly}
                        className={attachError.position ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {attachError.position && <p className="text-xs text-destructive">{attachError.position}</p>}
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Điểm ghi đè</label>
                      <Input
                        type="number"
                        value={attachDraft.score_override}
                        onChange={(event) => {
                          setAttachForms((current) => ({
                            ...current,
                            [section.id]: { ...attachDraft, score_override: event.target.value },
                          }));
                          setAttachErrors((current) => ({
                            ...current,
                            [section.id]: { ...current[section.id], score_override: undefined },
                          }));
                        }}
                        disabled={isReadOnly}
                        className={attachError.score_override ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {attachError.score_override && <p className="text-xs text-destructive">{attachError.score_override}</p>}
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                      <Button
                        size="sm"
                        className="bg-brand text-brand-foreground hover:bg-brand/90"
                        disabled={isReadOnly || attachQuestionMutation.isPending || !attachDraft.question_id}
                        onClick={() =>
                          void attachQuestionMutation.mutateAsync({
                            sectionId: section.id,
                            payload: attachDraft,
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Gắn câu hỏi
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {!isReadOnly && (
              <Card className="p-4 border-dashed">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="grid gap-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Tiêu đề phần mới</label>
                    <Input
                      value={newSectionForm.title}
                      onChange={(event) => {
                        setNewSectionForm((current) => ({ ...current, title: event.target.value }));
                        setNewSectionErrors((current) => ({ ...current, title: undefined }));
                      }}
                      placeholder="Phần 1"
                      className={newSectionErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {newSectionErrors.title && <p className="text-xs text-destructive">{newSectionErrors.title}</p>}
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Vị trí</label>
                    <Input
                      type="number"
                      min="1"
                      value={newSectionForm.position}
                      onChange={(event) => {
                        setNewSectionForm((current) => ({ ...current, position: event.target.value }));
                        setNewSectionErrors((current) => ({ ...current, position: undefined }));
                      }}
                      className={newSectionErrors.position ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {newSectionErrors.position && <p className="text-xs text-destructive">{newSectionErrors.position}</p>}
                  </div>
                  <div className="grid gap-1.5 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground">Hướng dẫn</label>
                    <Textarea
                      value={newSectionForm.instructions}
                      onChange={(event) => {
                        setNewSectionForm((current) => ({ ...current, instructions: event.target.value }));
                        setNewSectionErrors((current) => ({ ...current, instructions: undefined }));
                      }}
                      className={`min-h-20 ${newSectionErrors.instructions ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {newSectionErrors.instructions && <p className="text-xs text-destructive">{newSectionErrors.instructions}</p>}
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <Button
                      variant="outline"
                      className="border-dashed"
                      disabled={!testId || addSectionMutation.isPending}
                      onClick={() => void addSectionMutation.mutateAsync()}
                    >
                      {addSectionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span className="ml-1.5">Thêm phần</span>
                    </Button>
                  </div>
                </div>
                {!testId && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Hãy lưu bản nháp trước để bật quản lý phần và câu hỏi.
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
