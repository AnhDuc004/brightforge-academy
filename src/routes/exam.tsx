import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  Loader2,
  Save,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getAttempt, flattenAttemptQuestions, saveAttemptAnswer, submitAttempt } from "@/lib/attempts";
import { parseApiError } from "@/lib/auth";

export const Route = createFileRoute("/exam")({
  validateSearch: (search) => ({
    attemptId: typeof search.attemptId === "string" ? search.attemptId : undefined,
  }),
  head: () => ({ meta: [{ title: "Take exam · ExamForge" }] }),
  component: ExamPage,
});

type AnswerValue = string | string[];

function ExamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { attemptId } = Route.useSearch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const attemptQuery = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getAttempt(attemptId ?? ""),
    enabled: Boolean(attemptId),
    retry: false,
  });

  const attempt = attemptQuery.data;
  const questions = useMemo(() => flattenAttemptQuestions(attempt), [attempt]);
  const currentQuestion = questions[currentIndex];
  const isLocked = attempt?.status !== "in_progress";
  const answeredCount = questions.filter((question) => hasAnswer(answers[question.id])).length;

  useEffect(() => {
    if (!attempt) return;

    const initialAnswers: Record<string, AnswerValue> = {};
    for (const answer of attempt.answers) {
      initialAnswers[answer.test_section_question_id] = extractAnswer(answer.response);
    }
    setAnswers(initialAnswers);
  }, [attempt?.id]);

  useEffect(() => {
    if (!attempt?.expires_at || attempt.status !== "in_progress") {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(attempt.expires_at ?? "").getTime();
      setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.expires_at, attempt?.status]);

  const saveMutation = useMutation({
    mutationFn: ({ questionId, value }: { questionId: string; value: AnswerValue }) =>
      saveAttemptAnswer(attemptId ?? "", {
        test_section_question_id: questionId,
        response: buildAnswerResponse(value),
      }),
    onSuccess: async () => {
      setLastSavedAt(new Date().toLocaleTimeString());
      await queryClient.invalidateQueries({ queryKey: ["attempt", attemptId] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitAttempt(attemptId ?? ""),
    onSuccess: async () => {
      toast.success("Exam submitted.");
      await queryClient.invalidateQueries({ queryKey: ["attempt", attemptId] });
      navigate({ to: "/assignments" });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  useEffect(() => {
    if (
      attempt?.status === "in_progress" &&
      secondsLeft === 0 &&
      attempt.expires_at &&
      new Date(attempt.expires_at).getTime() <= Date.now()
    ) {
      submitMutation.mutate();
    }
  }, [attempt?.expires_at, attempt?.status, secondsLeft]);

  function updateAnswer(questionId: string, value: AnswerValue, saveNow = true) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    if (saveNow && attemptId && !isLocked) {
      saveMutation.mutate({ questionId, value });
    }
  }

  function saveCurrentAnswer() {
    if (!currentQuestion || isLocked) return;
    saveMutation.mutate({
      questionId: currentQuestion.id,
      value: answers[currentQuestion.id] ?? "",
    });
  }

  function submitExam() {
    if (!attemptId || isLocked) return;
    const confirmed = window.confirm("Submit this exam now? You cannot edit answers after submission.");
    if (confirmed) submitMutation.mutate();
  }

  if (!attemptId) {
    return (
      <ExamShell>
        <EmptyState
          title="No attempt selected"
          description="Start an assignment first so ExamForge can create an attempt and load the test snapshot."
        />
      </ExamShell>
    );
  }

  if (attemptQuery.isLoading) {
    return (
      <ExamShell>
        <div className="grid min-h-screen place-items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attempt...
          </div>
        </div>
      </ExamShell>
    );
  }

  if (attemptQuery.error || !attempt) {
    return (
      <ExamShell>
        <EmptyState
          title="Could not load attempt"
          description={parseApiError(attemptQuery.error).message}
        />
      </ExamShell>
    );
  }

  if (!currentQuestion) {
    return (
      <ExamShell>
        <EmptyState
          title="No questions in this attempt"
          description="The backend returned an attempt, but the test snapshot has no section questions."
        />
      </ExamShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-brand-foreground">
            <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{attempt.test?.title ?? "Exam"}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Attempt {attempt.id.slice(0, 8)} · {attempt.status}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="text-muted-foreground">Progress</span>
            <Progress value={(answeredCount / Math.max(questions.length, 1)) * 100} className="h-2 w-40" />
            <span className="font-medium">
              {answeredCount}/{questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-ink px-3 py-1.5 font-mono text-sm tabular-nums text-brand shadow-sm">
            <Clock className="h-4 w-4" /> {formatSeconds(secondsLeft)}
          </div>

          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={isLocked || submitMutation.isPending}
            onClick={submitExam}
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit exam
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-brand/30 bg-brand/15 px-5 py-2 text-xs">
        <ShieldAlert className="h-3.5 w-3.5 text-foreground" />
        <span>
          <strong>Secure attempt.</strong> Timer and submit state are enforced by the backend.
        </span>
        <span className="ml-auto text-muted-foreground">
          {saveMutation.isPending ? "Saving..." : lastSavedAt ? `Saved at ${lastSavedAt}` : "Answers save as you work"}{" "}
          <CheckCircle2 className="inline h-3 w-3 text-success" />
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-card p-4 md:block">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question navigator
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((question, index) => {
              const answered = hasAnswer(answers[question.id]);
              const active = index === currentIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentIndex(index)}
                  className={
                    "h-9 rounded-md border text-xs font-medium transition " +
                    (active
                      ? "border-ink bg-ink text-brand"
                      : answered
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-border bg-background text-muted-foreground hover:bg-muted")
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-5 space-y-1.5 text-xs">
            <Legend className="bg-ink" label="Current" />
            <Legend className="bg-success" label="Answered" />
            <Legend className="bg-border" label="Unanswered" />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-6 md:p-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {currentQuestion.section.title}
                  {currentQuestion.section.instructions ? ` · ${currentQuestion.section.instructions}` : ""}
                </div>
                <h2 className="mt-1 text-lg font-semibold">
                  Question {currentIndex + 1}{" "}
                  <span className="font-normal text-muted-foreground">of {questions.length}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-brand/40 bg-brand/15">
                  {currentQuestion.question.max_score} points
                </Badge>
                <Button variant="outline" size="sm" disabled>
                  <Flag className="mr-1.5 h-3.5 w-3.5" />
                  Flag
                </Button>
              </div>
            </div>

            <Card className="p-6">
              <p className="mb-5 text-[15px] leading-relaxed">{currentQuestion.question.content}</p>
              <AnswerInput
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                disabled={isLocked}
                onChange={(value, saveNow) => updateAnswer(currentQuestion.id, value, saveNow)}
              />
            </Card>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="h-3.5 w-3.5" />
              {isLocked ? "This attempt is locked." : "Answers save to the backend."}
            </div>
          </div>
        </main>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t bg-card px-5 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={saveCurrentAnswer} disabled={isLocked || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save answer
        </Button>
        <Link to="/assignments" className="ml-2 text-xs text-muted-foreground hover:underline">
          Exit to assignments
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            className="bg-ink text-brand hover:bg-ink/90"
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex >= questions.length - 1}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

function AnswerInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: ReturnType<typeof flattenAttemptQuestions>[number];
  value: AnswerValue | undefined;
  disabled: boolean;
  onChange: (value: AnswerValue, saveNow: boolean) => void;
}) {
  const type = question.question.type;
  const options = type === "true_false" && question.question.options.length === 0
    ? [
        { label: "True", value: "true" },
        { label: "False", value: "false" },
      ]
    : question.question.options;

  if (type === "multiple_select") {
    const current = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];

    return (
      <div className="space-y-2">
        {options.map((option, index) => {
          const checked = current.includes(option.value);
          return (
            <label
              key={`${option.value}-${index}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3.5 transition hover:border-brand/40 hover:bg-brand/5"
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(nextChecked) => {
                  const next = nextChecked
                    ? [...current, option.value]
                    : current.filter((item) => item !== option.value);
                  onChange(next, true);
                }}
                className="mt-1"
              />
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-muted font-mono text-[11px]">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm leading-relaxed">{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "true_false" || options.length > 0) {
    return (
      <RadioGroup
        value={typeof value === "string" ? value : ""}
        onValueChange={(next) => onChange(next, true)}
        disabled={disabled}
      >
        {options.map((option, index) => (
          <label
            key={`${option.value}-${index}`}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3.5 transition hover:border-brand/40 hover:bg-brand/5"
          >
            <RadioGroupItem value={option.value} className="mt-1" />
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-muted font-mono text-[11px]">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="text-sm leading-relaxed">{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  return (
    <Textarea
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value, false)}
      onBlur={(event) => onChange(event.target.value, true)}
      disabled={disabled}
      placeholder="Type your answer..."
      className="min-h-40"
    />
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="max-w-md p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-brand" />
        <h1 className="mt-3 text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button asChild className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link to="/assignments">Back to assignments</Link>
        </Button>
      </Card>
    </div>
  );
}

function ExamShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={"h-3 w-3 rounded-sm " + className} /> {label}
    </div>
  );
}

function extractAnswer(response: Record<string, unknown> | null): AnswerValue {
  const answer =
    response?.answer ??
    response?.value ??
    response?.selected ??
    response?.selected_option ??
    response?.selected_options ??
    response?.text ??
    "";
  if (Array.isArray(answer)) return answer.map(String);
  return typeof answer === "string" ? answer : String(answer ?? "");
}

function hasAnswer(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

function formatSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function buildAnswerResponse(value: AnswerValue) {
  if (Array.isArray(value)) {
    return {
      answer: value,
      selected_options: value,
    };
  }

  return {
    answer: value,
    selected_option: value,
    text: value,
  };
}
