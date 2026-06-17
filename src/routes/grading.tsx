import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, ShieldCheck, Star } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { flattenAttemptQuestions, type AttemptAnswer, type AttemptResource } from "@/lib/attempts";
import { finalizeAttempt, listPendingGrading, reviewAnswer } from "@/lib/grading";
import { parseApiError } from "@/lib/auth";

export const Route = createFileRoute("/grading")({
  head: () => ({ meta: [{ title: "Grading · ExamForge" }] }),
  component: GradingPage,
});

function GradingPage() {
  const queryClient = useQueryClient();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(0);
  const [manualScore, setManualScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["grading", "pending"],
    queryFn: () => listPendingGrading({ per_page: 50 }),
    staleTime: 20_000,
    retry: false,
  });

  const attempts = pendingQuery.data?.attempts ?? [];
  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedAttemptId) ?? attempts[0] ?? null;
  const reviewableAnswers = useMemo(() => selectedAttempt?.answers ?? [], [selectedAttempt]);
  const selectedAnswer = reviewableAnswers[selectedAnswerIndex] ?? reviewableAnswers[0] ?? null;
  const selectedQuestion = selectedAttempt && selectedAnswer
    ? findQuestionForAnswer(selectedAttempt, selectedAnswer)
    : null;

  useEffect(() => {
    if (!selectedAttemptId && attempts[0]) {
      setSelectedAttemptId(attempts[0].id);
    }
  }, [attempts, selectedAttemptId]);

  useEffect(() => {
    setSelectedAnswerIndex(0);
  }, [selectedAttempt?.id]);

  useEffect(() => {
    setManualScore(selectedAnswer?.manual_score == null ? "" : String(selectedAnswer.manual_score));
    setFeedback(selectedAnswer?.reviewer_feedback ?? "");
  }, [selectedAnswer?.id]);

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!selectedAnswer) throw new Error("No answer selected.");
      return reviewAnswer(selectedAnswer.id, {
        manual_score: Number(manualScore),
        reviewer_feedback: feedback.trim() || null,
      });
    },
    onSuccess: async () => {
      toast.success("Answer reviewed.");
      await queryClient.invalidateQueries({ queryKey: ["grading", "pending"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => {
      if (!selectedAttempt) throw new Error("No attempt selected.");
      return finalizeAttempt(selectedAttempt.id);
    },
    onSuccess: async () => {
      toast.success("Attempt finalized.");
      await queryClient.invalidateQueries({ queryKey: ["grading", "pending"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  function saveAndNext() {
    if (!selectedAnswer) return;
    if (!Number.isFinite(Number(manualScore)) || Number(manualScore) < 0) {
      toast.error("Manual score must be a non-negative number.");
      return;
    }

    reviewMutation.mutate(undefined, {
      onSuccess: () => {
        setSelectedAnswerIndex((current) => Math.min(reviewableAnswers.length - 1, current + 1));
      },
    });
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Grading" }, { label: "Pending Reviews" }]}
      title="Review & grading workspace"
      description="Review submitted answers, save manual scores, and finalize attempts from backend grading queue."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()} disabled={pendingQuery.isFetching}>
            {pendingQuery.isFetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={!selectedAttempt || finalizeMutation.isPending}
            onClick={() => finalizeMutation.mutate()}
          >
            {finalizeMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            Finalize attempt
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden xl:col-span-1">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <div className="text-sm font-semibold">Queue</div>
            <Badge variant="secondary">{pendingQuery.data?.total ?? attempts.length}</Badge>
          </div>
          {pendingQuery.isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading pending attempts...
            </div>
          ) : pendingQuery.error ? (
            <div className="p-6 text-sm text-destructive">{parseApiError(pendingQuery.error).message}</div>
          ) : attempts.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No pending grading attempts.</div>
          ) : (
            <ul className="max-h-[60vh] divide-y overflow-y-auto">
              {attempts.map((attempt) => {
                const active = attempt.id === selectedAttempt?.id;
                return (
                  <li
                    key={attempt.id}
                    className={"cursor-pointer p-3 hover:bg-muted/30 " + (active ? "border-l-2 border-brand bg-brand/10" : "")}
                    onClick={() => setSelectedAttemptId(attempt.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{attempt.test?.title ?? "Untitled test"}</span>
                      <Badge variant="outline" className={attempt.status === "submitted" ? "border-brand/40 bg-brand/15" : ""}>
                        {attempt.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {attempt.answers.length} answers · submitted {formatDateTime(attempt.submitted_at)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">{attempt.id}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4 xl:col-span-3">
          {!selectedAttempt || !selectedAnswer || !selectedQuestion ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Select a pending attempt with answers to start grading.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Question · {selectedQuestion.question.max_score} pts
                  </div>
                  <h3 className="text-[15px] font-semibold leading-relaxed">{selectedQuestion.question.content}</h3>
                  <div className="mt-4 text-xs text-muted-foreground">Type</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{selectedQuestion.question.type}</Badge>
                    {selectedQuestion.question.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Student answer</div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedAttempt.assignee_id.slice(0, 8)} · {selectedAttempt.id.slice(0, 8)}
                    </Badge>
                  </div>
                  <p className="mt-2 rounded-md border bg-background p-3 text-sm leading-relaxed">
                    {formatResponse(selectedAnswer.response)}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDateTime(selectedAnswer.created_at ?? selectedAttempt.submitted_at)}</span>
                    <span>·</span>
                    <span>{selectedAnswer.review_status ?? "pending"}</span>
                  </div>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Star className="h-4 w-4 text-brand" />
                  Scoring panel
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Auto score</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input value={selectedAnswer.auto_score ?? ""} readOnly className="h-10 font-semibold" />
                      <span className="text-sm text-muted-foreground">/ {selectedQuestion.question.max_score}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Manual score</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        value={manualScore}
                        onChange={(event) => setManualScore(event.target.value)}
                        type="number"
                        min="0"
                        max={selectedQuestion.question.max_score}
                        className="h-10 font-semibold"
                      />
                      <span className="text-sm text-muted-foreground">/ {selectedQuestion.question.max_score}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                    <div className="mt-1.5">
                      <Badge variant="outline" className={selectedAnswer.review_status === "reviewed" ? "border-success/30 bg-success/15 text-success" : "border-brand/40 bg-brand/15"}>
                        {selectedAnswer.review_status ?? "pending"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Feedback for student</label>
                  <Textarea
                    className="mt-1.5"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Write reviewer feedback..."
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedAnswerIndex <= 0}
                    onClick={() => setSelectedAnswerIndex((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous answer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate()}
                  >
                    {reviewMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                    Save review
                  </Button>
                  <Button
                    size="sm"
                    className="ml-auto bg-ink text-brand hover:bg-ink/90"
                    disabled={reviewMutation.isPending}
                    onClick={saveAndNext}
                  >
                    Save & next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function findQuestionForAnswer(attempt: AttemptResource, answer: AttemptAnswer) {
  return flattenAttemptQuestions(attempt).find((question) => question.id === answer.test_section_question_id) ?? null;
}

function formatResponse(response: Record<string, unknown> | null) {
  if (!response) return "No answer submitted.";
  const value =
    response.answer ??
    response.selected_option ??
    response.selected_options ??
    response.text ??
    response.value ??
    response.selected ??
    response;

  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value || "No answer submitted.");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
