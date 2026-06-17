import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/auth";
import {
  type Question,
  type QuestionDifficulty,
  type QuestionPayload,
  type QuestionStatus,
  type QuestionType,
  archiveQuestion,
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  publishQuestion,
  updateQuestion,
} from "@/lib/questions";

export const Route = createFileRoute("/questions")({
  head: () => ({ meta: [{ title: "Question Bank · ExamForge" }] }),
  component: QuestionsPage,
});

const questionTypes: QuestionType[] = ["multiple_choice", "short_answer", "essay", "true_false"];
const difficulties: QuestionDifficulty[] = ["easy", "medium", "hard"];
const statuses: QuestionStatus[] = ["draft", "published", "archived"];

const initialForm = {
  type: "multiple_choice" as QuestionType,
  content: "",
  optionsText: "3\n4\n5\n6",
  correctAnswerText: "4",
  maxScore: "10",
  difficulty: "easy" as QuestionDifficulty,
  tagsText: "math, arithmetic",
};

function statusTone(status: QuestionStatus) {
  if (status === "published") return "bg-success/15 text-success border-success/30";
  if (status === "draft") return "bg-muted text-muted-foreground border-border";
  return "bg-foreground/10 text-muted-foreground border-border";
}

function diffTone(difficulty: QuestionDifficulty) {
  if (difficulty === "easy") return "bg-emerald-100 text-emerald-700";
  if (difficulty === "medium") return "bg-brand/20 text-foreground";
  return "bg-rose-100 text-rose-700";
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayload(form: typeof initialForm): QuestionPayload {
  return {
    type: form.type,
    content: form.content.trim(),
    options: splitLines(form.optionsText),
    correct_answer: splitLines(form.correctAnswerText),
    max_score: Number(form.maxScore),
    difficulty: form.difficulty,
    tags: splitCsv(form.tagsText),
  };
}

function formFromQuestion(question: Question) {
  return {
    type: question.type,
    content: question.content,
    optionsText: question.options.join("\n"),
    correctAnswerText: question.correct_answer.join("\n"),
    maxScore: String(question.max_score),
    difficulty: question.difficulty,
    tagsText: question.tags.join(", "),
  };
}

function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | "all">("all");
  const [tagsFilter, setTagsFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState(initialForm);

  const statusStats = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: questions.filter((question) => question.status === status).length,
      })),
    [questions],
  );

  async function loadQuestions(nextPage = page) {
    setIsLoading(true);

    try {
      const result = await listQuestions({
        page: nextPage,
        per_page: 10,
        status: statusFilter,
        tags: splitCsv(tagsFilter),
      });

      setQuestions(result.questions);
      setPage(result.page);
      setLastPage(result.lastPage);
      setTotal(result.total);
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadQuestions(1);
  }, []);

  function openCreateDialog() {
    setEditingQuestion(null);
    setForm(initialForm);
    setFormOpen(true);
  }

  function openEditDialog(question: Question) {
    setEditingQuestion(question);
    setForm(formFromQuestion(question));
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        toast.success("Question updated.");
      } else {
        await createQuestion(payload);
        toast.success("Question created.");
      }

      setFormOpen(false);
      await loadQuestions(page);
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleView(question: Question) {
    setDetailOpen(true);
    setSelectedQuestion(null);

    try {
      setSelectedQuestion(await getQuestion(question.id));
    } catch (error) {
      setDetailOpen(false);
      toast.error(parseApiError(error).message);
    }
  }

  async function handlePublish(question: Question) {
    try {
      await publishQuestion(question.id);
      toast.success("Question published.");
      await loadQuestions(page);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleArchive(question: Question) {
    try {
      await archiveQuestion(question.id);
      toast.success("Question archived.");
      await loadQuestions(page);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleDelete(question: Question) {
    const confirmed = window.confirm(`Delete question ${question.id}?`);
    if (!confirmed) return;

    try {
      await deleteQuestion(question.id);
      toast.success("Question deleted.");
      await loadQuestions(page);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadQuestions(1);
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Question Bank" }, { label: "Questions" }]}
      title="Questions"
      description="Manage question content, answers, tags, publication status, and archive lifecycle."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => loadQuestions(page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          <Link to="/questions/new">
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Full editor
            </Button>
          </Link>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" /> Create question
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {statusStats.map((item) => (
          <Card key={item.status} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{item.status}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{item.count}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-center gap-2" onSubmit={applyFilters}>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={tagsFilter}
              onChange={(event) => setTagsFilter(event.target.value)}
              placeholder="Filter by tags: math, arithmetic"
              className="h-9 pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as QuestionStatus | "all")}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">
            <Filter className="mr-1.5 h-4 w-4" /> Apply
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span>{total} questions</span>
          <span>Page {page} of {lastPage}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Question</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Difficulty</th>
                <th className="px-4 py-2.5 text-left font-medium">Score</th>
                <th className="px-4 py-2.5 text-left font-medium">Tags</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Created</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No questions found.
                  </td>
                </tr>
              ) : (
                questions.map((question) => (
                  <tr key={question.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="max-w-md line-clamp-1 font-medium text-foreground">{question.content}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{question.id}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{question.type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${diffTone(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">{question.max_score}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {question.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="font-normal text-[11px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusTone(question.status)}>
                        {question.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {question.created_at?.slice(0, 10) ?? "Unknown"}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(question)}>
                            <Eye className="h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(question)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePublish(question)}>
                            <Send className="h-4 w-4" /> Publish
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(question)}>
                            <Archive className="h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(question)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {questions.length} of {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page <= 1}
              onClick={() => loadQuestions(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page >= lastPage}
              onClick={() => loadQuestions(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit question" : "Create question"}</DialogTitle>
            <DialogDescription>
              Options and correct answers are entered one per line. Tags are comma-separated.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                className="min-h-28"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as QuestionType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(value) => setForm((current) => ({ ...current, difficulty: value as QuestionDifficulty }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_score">Max score</Label>
                <Input
                  id="max_score"
                  type="number"
                  min="0"
                  value={form.maxScore}
                  onChange={(event) => setForm((current) => ({ ...current, maxScore: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="options">Options</Label>
                <Textarea
                  id="options"
                  value={form.optionsText}
                  onChange={(event) => setForm((current) => ({ ...current, optionsText: event.target.value }))}
                  className="min-h-32 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="correct_answer">Correct answer</Label>
                <Textarea
                  id="correct_answer"
                  value={form.correctAnswerText}
                  onChange={(event) => setForm((current) => ({ ...current, correctAnswerText: event.target.value }))}
                  className="min-h-32 font-mono text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tagsText}
                onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))}
                placeholder="math, arithmetic"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingQuestion ? "Save changes" : "Create question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question details</DialogTitle>
            <DialogDescription>Fetched from GET /api/v1/questions/{selectedQuestion?.id || "id"}.</DialogDescription>
          </DialogHeader>
          {selectedQuestion ? (
            <Textarea
              value={JSON.stringify(selectedQuestion, null, 2)}
              readOnly
              className="min-h-80 font-mono text-xs"
            />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading question...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
