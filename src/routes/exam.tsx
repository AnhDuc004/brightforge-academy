import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
import {
  flattenAttemptQuestions,
  heartbeatAttempt,
  resumeAttempt,
  saveAttemptAnswer,
  submitAttempt,
} from "@/lib/attempts";
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
  const [isQuestionSwitching, setIsQuestionSwitching] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const stripButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const attemptQuery = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => resumeAttempt(attemptId ?? ""),
    enabled: Boolean(attemptId),
    retry: false,
  });

  const attempt = attemptQuery.data;
  const questions = useMemo(() => flattenAttemptQuestions(attempt), [attempt]);
  const currentQuestion = questions[currentIndex];
  const isLocked = attempt?.status !== "in_progress";
  const answeredCount = questions.filter((question) => hasAnswer(answers[question.id])).length;
  const progressPercent = (answeredCount / Math.max(questions.length, 1)) * 100;
  const currentProgress = Math.min(currentIndex + 1, questions.length);
  const sectionLabel = currentQuestion?.section.title ?? "Section";
  const sectionInstructions = currentQuestion?.section.instructions;

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

  const syncHeartbeat = useEffectEvent(async () => {
    if (!attemptId) return;

    try {
      const nextAttempt = await heartbeatAttempt(attemptId);
      queryClient.setQueryData(["attempt", attemptId], nextAttempt);
    } catch (error) {
      const { message } = parseApiError(error);

      if (!/unauthenticated|forbidden/i.test(message)) {
        console.warn("[attempt-heartbeat]", message);
      }
    }
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

  useEffect(() => {
    if (!attemptId || attempt?.status !== "in_progress") {
      return;
    }

    const heartbeatTimer = window.setInterval(() => {
      void syncHeartbeat();
    }, 30000);

    return () => window.clearInterval(heartbeatTimer);
  }, [attemptId, attempt?.status, syncHeartbeat]);

  useEffect(() => {
    if (!currentQuestion) return;

    setIsQuestionSwitching(true);

    const stripButton = stripButtonRefs.current[currentQuestion.id];
    stripButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });

    const timer = window.setTimeout(() => setIsQuestionSwitching(false), 180);
    return () => window.clearTimeout(timer);
  }, [currentQuestion?.id]);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,179,1,0.16),transparent_30%),linear-gradient(180deg,#0f0f10_0%,#111111_20%,#f7f6f2_20%,#f7f6f2_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-3 pb-4 pt-3 sm:px-4 lg:px-5">
        <header className="sticky top-3 z-30 rounded-3xl border border-black/5 bg-background/90 px-4 py-4 shadow-[0_18px_40px_rgba(15,15,15,0.08)] backdrop-blur md:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#111111,#f5b301)] text-brand-foreground shadow-md shadow-brand/20">
                  <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Live attempt
                    </div>
                    <Badge variant="outline" className="border-brand/30 bg-brand/10">
                      {sectionLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        hasAnswer(answers[currentQuestion.id])
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border bg-muted/40"
                      }
                    >
                      {hasAnswer(answers[currentQuestion.id]) ? "Answered" : "Unanswered"}
                    </Badge>
                  </div>
                  <h1 className="mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {attempt.test?.title ?? "Exam"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    Attempt {attempt.id.slice(0, 8)} · {currentProgress}/{questions.length} questions
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Time left
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-semibold tabular-nums">
                    <Clock className="h-4.5 w-4.5 text-brand" />
                    {formatSeconds(secondsLeft)}
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Save
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-medium">
                    <span
                      className={
                        "h-2.5 w-2.5 rounded-full " +
                        (saveMutation.isPending ? "bg-brand animate-pulse" : "bg-success")
                      }
                    />
                    {saveMutation.isPending ? "Saving" : lastSavedAt ? `Saved ${lastSavedAt}` : "Ready"}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={isLocked || submitMutation.isPending}
                  onClick={submitExam}
                >
                  {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-brand/20 bg-[linear-gradient(135deg,rgba(245,179,1,0.10),rgba(255,255,255,0.92))] px-4 py-3 text-sm md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-foreground" />
                <span>
                  <strong>Secure attempt.</strong> Autosave and timer are enforced by the backend.
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground md:ml-auto">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {saveMutation.isPending
                  ? "Saving answers..."
                  : lastSavedAt
                    ? `Last saved at ${lastSavedAt}`
                    : "Answers save as you work"}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 rounded-3xl border bg-background/90 p-3 shadow-sm">
          <div
            ref={stripRef}
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {questions.map((question, index) => {
              const answered = hasAnswer(answers[question.id]);
              const active = index === currentIndex;

              return (
                <button
                  key={question.id}
                  ref={(node) => {
                    stripButtonRefs.current[question.id] = node;
                  }}
                  onClick={() => setCurrentIndex(index)}
                  className={
                    "flex h-12 min-w-[3.25rem] items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition-all duration-200 " +
                    (active
                      ? "border-brand bg-ink text-brand shadow-sm scale-[1.02]"
                      : answered
                        ? "border-success/30 bg-success/10 text-success hover:border-success/50"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/80")
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {currentProgress}/{questions.length} questions
            </span>
            <span>·</span>
            <span>{sectionInstructions || sectionLabel}</span>
            <span className="ml-auto hidden items-center gap-3 sm:flex">
              <Legend className="bg-ink" label="Current" />
              <Legend className="bg-success" label="Answered" />
              <Legend className="bg-border" label="Open" />
            </span>
          </div>
        </div>

        <main className="mt-4 flex-1">
          <Card
            key={currentQuestion.id}
            className={
              "overflow-hidden border-brand/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] shadow-[0_18px_55px_rgba(15,15,15,0.08)] transition-all duration-200 " +
              (isQuestionSwitching ? "opacity-80 scale-[0.996]" : "opacity-100 scale-100")
            }
          >
            <div className="border-b px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Question {currentProgress} of {questions.length}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {currentQuestion.question.max_score} point question
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-brand/30 bg-brand/10">
                  {sectionLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    hasAnswer(answers[currentQuestion.id])
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-muted/40"
                  }
                >
                  {hasAnswer(answers[currentQuestion.id]) ? "Answered" : "Unanswered"}
                </Badge>
                <Button variant="outline" size="sm" disabled>
                    <Flag className="mr-1.5 h-3.5 w-3.5" />
                    Flag
                  </Button>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#111111,#f5b301)] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
                <div className="rounded-3xl border border-brand/10 bg-[linear-gradient(180deg,rgba(245,179,1,0.07),rgba(255,255,255,0.8))] p-5 sm:p-6">
                  <p className="text-lg leading-8 text-foreground sm:text-xl">
                    {currentQuestion.question.content}
                  </p>
                </div>

              <div className="mt-5 rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Your answer</div>
                    <div className="text-xs text-muted-foreground">
                      Choose carefully. Your answer will autosave.
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-muted/40">
                    Auto-save enabled
                  </Badge>
                </div>
                <AnswerInput
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  disabled={isLocked}
                  onChange={(value, saveNow) => updateAnswer(currentQuestion.id, value, saveNow)}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Save className="h-3.5 w-3.5" />
                {isLocked ? "This attempt is locked." : "Changes are sent to the backend automatically."}
              </div>
            </div>
          </Card>

          <div className="mt-4 flex flex-col gap-3 rounded-3xl border bg-background/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Use the question strip above to jump around quickly.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentAnswer}
                disabled={isLocked || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save
              </Button>
              <Link to="/assignments" className="text-xs text-muted-foreground hover:underline">
                Exit to assignments
              </Link>
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
          </div>
        </main>
      </div>
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
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(245,179,1,0.16),transparent_30%),linear-gradient(180deg,#0f0f10_0%,#111111_28%,#f7f6f2_28%,#f7f6f2_100%)] px-4">
      <Card className="max-w-lg overflow-hidden border-brand/20 bg-white/90 p-0 shadow-[0_22px_60px_rgba(15,15,15,0.12)]">
        <div className="h-2 bg-[linear-gradient(90deg,#111111,#f5b301)]" />
        <div className="p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/15">
            <AlertTriangle className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <Button asChild className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/assignments">Back to assignments</Link>
          </Button>
        </div>
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
