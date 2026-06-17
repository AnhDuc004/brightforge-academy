import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Archive,
  Clipboard,
  Eye,
  FileStack,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  User,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getTenantId, hasPermission, parseApiError } from "@/lib/auth";
import { useAuthContextQuery } from "@/lib/auth-context";
import { listAllTests, type TestResource } from "@/lib/tests";
import { listAllUsers, type UserResource } from "@/lib/user-management";
import {
  type Assignment,
  type AssignmentAccessType,
  type AssignmentPayload,
  type AssignmentStatus,
  createAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  listMyAssignments,
  startAssignmentAttempt,
  updateAssignment,
  verifyAssignmentToken,
} from "@/lib/assignments";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Assignments · ExamForge" }] }),
  component: AssignmentsPage,
});

const assignmentStatuses: AssignmentStatus[] = ["assigned", "started", "completed", "expired", "archived"];

const initialForm = {
  test_id: "",
  assignee_id: "",
  due_at: "",
  max_attempts: "1",
  access_type: "token" as AssignmentAccessType,
  status: "assigned" as AssignmentStatus,
};

const assignmentSchema = z.object({
  test_id: z.string().trim().min(1, "Please select a test."),
  assignee_id: z.string().trim().min(1, "Please select an assignee."),
  due_at: z.string().trim().optional().nullable(),
  max_attempts: z.coerce.number().int("Max attempts must be an integer.").min(1, "Max attempts must be at least 1."),
  access_type: z.enum(["account", "token"]),
  status: z.enum(["assigned", "started", "completed", "expired", "archived"]).optional(),
});

type AssignmentFieldErrors = Partial<Record<"test_id" | "assignee_id" | "due_at" | "max_attempts" | "access_type" | "status", string>>;

function statusTone(status: AssignmentStatus) {
  switch (status) {
    case "assigned":
      return "bg-brand/20 text-foreground border-brand/40";
    case "started":
      return "bg-success/15 text-success border-success/30";
    case "completed":
      return "bg-muted text-muted-foreground border-border";
    case "expired":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "archived":
      return "bg-foreground/10 text-muted-foreground border-border";
    default:
      return "";
  }
}

function formatDateTimeForInput(value?: string | null) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

function formatDateTimeForApi(value: string) {
  if (!value) return null;
  return `${value.replace("T", " ")}:00`;
}

function formatDateTimeForDisplay(value?: string | null) {
  if (!value) return "No due date";
  return value.replace("T", " ").slice(0, 19);
}

function getAssigneeLabel(assignment: Assignment) {
  return (
    assignment.assignee?.display_name ||
    assignment.assignee?.name ||
    assignment.assignee?.email ||
    assignment.assignee_id
  );
}

function getTestLabel(assignment: Assignment) {
  return assignment.test?.title || assignment.test?.name || assignment.test_id;
}

function getAssignedByLabel(assignment: Assignment) {
  return (
    assignment.assigned_by_user?.display_name ||
    assignment.assigned_by_user?.name ||
    assignment.assigned_by_user?.email ||
    assignment.assigned_by ||
    "—"
  );
}

function buildPayload(form: typeof initialForm): AssignmentPayload {
  return {
    test_id: form.test_id.trim(),
    assignee_id: form.assignee_id.trim(),
    due_at: formatDateTimeForApi(form.due_at),
    max_attempts: Number(form.max_attempts),
    access_type: form.access_type,
  };
}

function extractAssignmentErrors(error: z.ZodError): AssignmentFieldErrors {
  const fieldErrors: AssignmentFieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key as keyof AssignmentFieldErrors]) {
      fieldErrors[key as keyof AssignmentFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}

type AttemptSummary = {
  id: string;
  status: string;
  submitted_at?: string | null;
  total_score?: number | null;
  auto_score?: number | null;
  manual_score?: number | null;
  is_passed?: boolean | null;
  is_finalized?: boolean | null;
};

function AssignmentDetailView({
  assignment,
  canManageAssignments,
  canReview,
  canViewReports,
  onStartAttempt,
}: {
  assignment: Assignment;
  canManageAssignments: boolean;
  canReview: boolean;
  canViewReports: boolean;
  onStartAttempt: () => void;
}) {
  const attempts = getAttemptSummaries(assignment);
  const latestAttempt = attempts[0] ?? null;
  const score = latestAttempt?.total_score ?? getNumberField(assignment, ["total_score", "score", "final_score"]);
  const isFinalized = latestAttempt?.is_finalized ?? getBooleanField(assignment, ["is_finalized"]);
  const isPassed = latestAttempt?.is_passed ?? getBooleanField(assignment, ["is_passed"]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 sm:col-span-2">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand/15">
              <FileStack className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Test</div>
              <h3 className="mt-1 truncate text-base font-semibold">{getTestLabel(assignment)}</h3>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{assignment.test_id}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Result</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{score == null ? "—" : score}</span>
            <span className="text-xs text-muted-foreground">{isFinalized ? "finalized" : "not finalized"}</span>
          </div>
          {isPassed != null && (
            <Badge
              variant="outline"
              className={isPassed ? "mt-2 border-success/30 bg-success/15 text-success" : "mt-2 border-destructive/30 bg-destructive/10 text-destructive"}
            >
              {isPassed ? "Passed" : "Failed"}
            </Badge>
          )}
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-brand" />
            Assignee
          </div>
          <DetailRow label="Name" value={getAssigneeLabel(assignment)} />
          <DetailRow label="Assignee ID" value={assignment.assignee_id} mono />
          <DetailRow label="Assigned by" value={getAssignedByLabel(assignment)} />
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Key className="h-4 w-4 text-brand" />
            Access & lifecycle
          </div>
          <DetailRow label="Status" value={<Badge variant="outline" className={statusTone(assignment.status)}>{assignment.status}</Badge>} />
          <DetailRow label="Due at" value={formatDateTimeForDisplay(assignment.due_at)} />
          <DetailRow label="Access type" value={assignment.access_type} />
          <DetailRow label="Max attempts" value={String(assignment.max_attempts)} />
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-brand" />
          Attempts and scores
        </div>
        {attempts.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            No attempt score was returned by the assignment detail API yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">Attempt</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Submitted</th>
                  <th className="py-2 text-left font-medium">Auto</th>
                  <th className="py-2 text-left font-medium">Manual</th>
                  <th className="py-2 text-left font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-2 font-mono text-xs">{attempt.id.slice(0, 8)}</td>
                    <td className="py-2">{attempt.status}</td>
                    <td className="py-2">{formatDateTimeForDisplay(attempt.submitted_at)}</td>
                    <td className="py-2">{attempt.auto_score ?? "—"}</td>
                    <td className="py-2">{attempt.manual_score ?? "—"}</td>
                    <td className="py-2 font-semibold">{attempt.total_score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {!canManageAssignments && assignment.status !== "completed" && (
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={onStartAttempt}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            Start attempt
          </Button>
        )}
        {canReview && (
          <Button asChild variant="outline">
            <Link to="/grading">Open grading</Link>
          </Button>
        )}
        {canViewReports && (
          <Button asChild variant="outline">
            <Link to="/results">Open reports</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-3 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "break-all font-mono text-xs" : "min-w-0"}>{value || "—"}</div>
    </div>
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getNumberField(source: unknown, fields: string[]) {
  const record = asRecord(source);
  for (const field of fields) {
    if (typeof record[field] === "number") return record[field] as number;
  }
  return null;
}

function getBooleanField(source: unknown, fields: string[]) {
  const record = asRecord(source);
  for (const field of fields) {
    if (typeof record[field] === "boolean") return record[field] as boolean;
  }
  return null;
}

function getAttemptSummaries(assignment: Assignment): AttemptSummary[] {
  const record = asRecord(assignment);
  const candidates = [
    record.attempts,
    record.assignment_attempts,
    record.results,
    record.submissions,
    record.latest_attempt ? [record.latest_attempt] : null,
    record.attempt ? [record.attempt] : null,
  ];

  const rawAttempts = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!rawAttempts) return [];

  return rawAttempts
    .map((attempt) => {
      const item = asRecord(attempt);
      return {
        id: String(item.id ?? item.attempt_id ?? ""),
        status: String(item.status ?? "unknown"),
        submitted_at: typeof item.submitted_at === "string" ? item.submitted_at : null,
        total_score: typeof item.total_score === "number" ? item.total_score : getNumberField(item, ["score", "final_score"]),
        auto_score: typeof item.auto_score === "number" ? item.auto_score : null,
        manual_score: typeof item.manual_score === "number" ? item.manual_score : null,
        is_passed: typeof item.is_passed === "boolean" ? item.is_passed : null,
        is_finalized: typeof item.is_finalized === "boolean" ? item.is_finalized : null,
      };
    })
    .filter((attempt) => attempt.id);
}

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authQuery = useAuthContextQuery();
  const canManageAssignments = hasPermission(authQuery.data, "assignments.manage");
  const canReview = hasPermission(authQuery.data, "grading.review");
  const canViewReports = hasPermission(authQuery.data, ["reports.view", "grading.review"]);
  const tenantId = getTenantId() ?? undefined;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [appliedAssigneeFilter, setAppliedAssigneeFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyResult, setVerifyResult] = useState("");
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<AssignmentFieldErrors>({});

  const testsQuery = useQuery({
    queryKey: ["tests", "published", tenantId],
    queryFn: () => listAllTests({ status: "published" }),
    enabled: canManageAssignments,
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", tenantId],
    queryFn: () => listAllUsers({ tenant_id: tenantId }),
    enabled: canManageAssignments,
    staleTime: 30_000,
  });

  const stats = useMemo(
    () =>
      assignmentStatuses.map((status) => ({
        status,
        value: assignments.filter((assignment) => assignment.status === status).length,
      })),
    [assignments],
  );

  const tests = testsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  async function loadAssignments(nextPage = page, nextAssigneeFilter = appliedAssigneeFilter) {
    setIsLoading(true);

    try {
      const result = canManageAssignments
        ? await listAssignments({
            page: nextPage,
            per_page: 10,
            assignee_id: nextAssigneeFilter,
          })
        : await listMyAssignments({ page: nextPage, per_page: 10 });

      setAssignments(result.assignments);
      setPage(result.page);
      setLastPage(result.lastPage);
      setTotal(result.total);
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function validateAssignmentForm() {
    const parsed = assignmentSchema.safeParse({
      test_id: form.test_id,
      assignee_id: form.assignee_id,
      due_at: form.due_at || null,
      max_attempts: form.max_attempts,
      access_type: form.access_type,
      status: editingAssignment ? form.status : undefined,
    });

    if (parsed.success) {
      setFormErrors({});
      return parsed.data;
    }

    setFormErrors(extractAssignmentErrors(parsed.error));
    return null;
  }

  useEffect(() => {
    void loadAssignments(1, "");
  }, [canManageAssignments]);

  function openCreateDialog() {
    setEditingAssignment(null);
    setCreatedToken(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEditDialog(assignment: Assignment) {
    setEditingAssignment(assignment);
    setCreatedToken(null);
    setForm({
      test_id: assignment.test_id,
      assignee_id: assignment.assignee_id,
      due_at: formatDateTimeForInput(assignment.due_at),
      max_attempts: String(assignment.max_attempts),
      access_type: assignment.access_type,
      status: assignment.status,
    });
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const valid = validateAssignmentForm();
      if (!valid) {
        throw new Error("Please fix the highlighted fields.");
      }

      const payload = buildPayload(form);

      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          ...payload,
          status: form.status,
        });
        toast.success("Assignment updated successfully.");
        setFormOpen(false);
      } else {
        const result = await createAssignment(payload);
        setCreatedToken(result.access_token);
        toast.success("Assignment created successfully.");
      }

      await loadAssignments(page, appliedAssigneeFilter);
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(assignment: Assignment) {
    const confirmed = window.confirm(`Delete assignment ${assignment.id}?`);
    if (!confirmed) return;

    try {
      await deleteAssignment(assignment.id);
      toast.success("Assignment deleted.");
      await loadAssignments(page, appliedAssigneeFilter);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleArchive(assignment: Assignment) {
    try {
      await updateAssignment(assignment.id, { status: "archived" });
      toast.success("Assignment archived.");
      await loadAssignments(page, appliedAssigneeFilter);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleStartAttempt(assignment: Assignment) {
    try {
      const attempt = await startAssignmentAttempt(assignment.id);
      const attemptId =
        attempt && typeof attempt === "object" && "id" in attempt ? String((attempt as { id: unknown }).id) : "";

      toast.success("Attempt started.");
      navigate({ to: "/exam", search: attemptId ? ({ attemptId } as never) : undefined });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleView(assignment: Assignment) {
    setDetailOpen(true);
    setSelectedAssignment(null);

    try {
      const detail = await getAssignment(assignment.id);
      setSelectedAssignment(detail);
    } catch (error) {
      setDetailOpen(false);
      toast.error(parseApiError(error).message);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);
    setVerifyResult("");

    try {
      const result = await verifyAssignmentToken(verifyToken.trim());
      setVerifyResult(JSON.stringify(result, null, 2));
      toast.success("Access token verified.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsVerifying(false);
    }
  }

  function applyAssigneeFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedAssigneeFilter(assigneeFilter.trim());
    void loadAssignments(1, assigneeFilter.trim());
  }

  const selectedTest = tests.find((test) => test.id === form.test_id);
  const selectedAssignee = users.find((user) => user.id === form.assignee_id);

  return (
    <AppLayout
      breadcrumbs={[{ label: "Assignments" }, { label: "Active" }]}
      title={canManageAssignments ? "Assignments" : "My assignments"}
      description={
        canManageAssignments
          ? "Distribute published tests to students, manage lifecycle status, and verify assignment access tokens."
          : "Open assigned tests and continue your in-progress attempts."
      }
      actions={
        canManageAssignments ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>
              <Key className="mr-1.5 h-4 w-4" /> Verify token
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadAssignments(page, appliedAssigneeFilter)}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={openCreateDialog}>
              <Plus className="mr-1.5 h-4 w-4" /> Assign test
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => loadAssignments(page, appliedAssigneeFilter)}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        )
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.status} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.status}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {canManageAssignments && (
          <form className="flex flex-wrap items-center gap-2 border-b p-3" onSubmit={applyAssigneeFilter}>
            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                placeholder="Filter by assignee ID"
                className="h-9 pl-8"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
            {appliedAssigneeFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssigneeFilter("");
                  setAppliedAssigneeFilter("");
                  void loadAssignments(1, "");
                }}
              >
                Clear
              </Button>
            )}
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Test</th>
                <th className="px-4 py-2.5 text-left font-medium">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium">Due date</th>
                <th className="px-4 py-2.5 text-left font-medium">Access</th>
                <th className="px-4 py-2.5 text-left font-medium">Attempts</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{getTestLabel(assignment)}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{assignment.test_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{getAssigneeLabel(assignment)}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {assignment.assignee_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDateTimeForDisplay(assignment.due_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-muted/40">
                        {assignment.access_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {typeof assignment.current_attempts === "number"
                        ? `${assignment.current_attempts}/${assignment.max_attempts}`
                        : assignment.max_attempts}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusTone(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </td>
                    <td className="px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleView(assignment)}>
                            <Eye className="h-4 w-4" /> View details
                          </DropdownMenuItem>
                          {!canManageAssignments && (
                            <DropdownMenuItem onClick={() => void handleStartAttempt(assignment)}>
                              <PlayCircle className="h-4 w-4" /> Start attempt
                            </DropdownMenuItem>
                          )}
                          {canManageAssignments && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(assignment)}>
                                <Pencil className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleArchive(assignment)}>
                                <Archive className="h-4 w-4" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => void handleDelete(assignment)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
            Page {page} of {lastPage} · {total} total
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page <= 1}
              onClick={() => void loadAssignments(page - 1, appliedAssigneeFilter)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page >= lastPage}
              onClick={() => void loadAssignments(page + 1, appliedAssigneeFilter)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        Need to take an exam?{" "}
        <Link to="/exam" className="font-medium underline">
          Open the exam-taking demo →
        </Link>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setFormErrors({});
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit assignment" : "Assign test"}</DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? "Update assignment settings and lifecycle status."
                : "Create an assignment for a user and generate an access token if access type is token."}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="test_id">Test</Label>
              <Select
                value={form.test_id}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, test_id: value }));
                  setFormErrors((current) => ({ ...current, test_id: undefined }));
                }}
              >
                <SelectTrigger id="test_id" className={formErrors.test_id ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Select a published test" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test: TestResource) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.test_id && <p className="text-xs text-destructive">{formErrors.test_id}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee_id">Assignee</Label>
              <Select
                value={form.assignee_id}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, assignee_id: value }));
                  setFormErrors((current) => ({ ...current, assignee_id: undefined }));
                }}
              >
                <SelectTrigger
                  id="assignee_id"
                  className={formErrors.assignee_id ? "border-destructive focus:ring-destructive" : ""}
                >
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: UserResource) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name} · {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.assignee_id && <p className="text-xs text-destructive">{formErrors.assignee_id}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="due_at">Due at</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={form.due_at}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, due_at: event.target.value }));
                    setFormErrors((current) => ({ ...current, due_at: undefined }));
                  }}
                  className={formErrors.due_at ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {formErrors.due_at && <p className="text-xs text-destructive">{formErrors.due_at}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_attempts">Max attempts</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min="1"
                  value={form.max_attempts}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, max_attempts: event.target.value }));
                    setFormErrors((current) => ({ ...current, max_attempts: undefined }));
                  }}
                  required
                  className={formErrors.max_attempts ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {formErrors.max_attempts && <p className="text-xs text-destructive">{formErrors.max_attempts}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Access type</Label>
              <Select
                value={form.access_type}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, access_type: value as AssignmentAccessType }));
                  setFormErrors((current) => ({ ...current, access_type: undefined }));
                }}
              >
                <SelectTrigger className={formErrors.access_type ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">token</SelectItem>
                  <SelectItem value="account">account</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.access_type && <p className="text-xs text-destructive">{formErrors.access_type}</p>}
            </div>

            {editingAssignment && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    setForm((current) => ({ ...current, status: value as AssignmentStatus }));
                    setFormErrors((current) => ({ ...current, status: undefined }));
                  }}
                >
                  <SelectTrigger className={formErrors.status ? "border-destructive focus:ring-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.status && <p className="text-xs text-destructive">{formErrors.status}</p>}
              </div>
            )}

            {createdToken && form.access_type === "token" && (
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Access token
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 rounded bg-background px-2 py-1 text-xs">{createdToken}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      void navigator.clipboard.writeText(createdToken);
                      toast.success("Token copied.");
                    }}
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Selected values</div>
              <div className="mt-1">Test: {selectedTest?.title ?? "—"}</div>
              <div>Assignee: {selectedAssignee ? `${selectedAssignee.display_name} (${selectedAssignee.email})` : "—"}</div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingAssignment ? "Save changes" : "Create assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify access token</DialogTitle>
            <DialogDescription>Check whether an assignment access token is valid.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleVerify}>
            <div className="grid gap-2">
              <Label htmlFor="access_token">Access token</Label>
              <Input
                id="access_token"
                value={verifyToken}
                onChange={(event) => setVerifyToken(event.target.value)}
                placeholder="random32chars.uniqid"
                required
              />
            </div>
            {verifyResult && <Textarea value={verifyResult} readOnly className="min-h-40 font-mono text-xs" />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVerifyOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={isVerifying} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assignment details</DialogTitle>
            <DialogDescription>Test, assignee, lifecycle, and available scoring information.</DialogDescription>
          </DialogHeader>
          {selectedAssignment ? (
            <AssignmentDetailView
              assignment={selectedAssignment}
              canManageAssignments={canManageAssignments}
              canReview={canReview}
              canViewReports={canViewReports}
              onStartAttempt={() => void handleStartAttempt(selectedAssignment)}
            />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading assignment...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
