import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Archive,
  Clipboard,
  Eye,
  FileStack,
  GraduationCap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission, parseApiError } from "@/lib/auth";
import { useAuthContextQuery } from "@/lib/auth-context";
import { listAllTests, type TestResource } from "@/lib/tests";
import { listSelectableStudents } from "@/lib/selectable-students";
import { type UserResource } from "@/lib/user-management";
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

const assignmentStatuses: AssignmentStatus[] = [
  "assigned",
  "started",
  "completed",
  "expired",
  "archived",
];

const initialForm = {
  test_id: "",
  assignee_id: "",
  assignee_ids: [] as string[],
  due_at: "",
  max_attempts: "1",
  access_type: "token" as AssignmentAccessType,
  status: "assigned" as AssignmentStatus,
  mode: "single" as "single" | "multiple",
};

const assignmentSchema = z
  .object({
    test_id: z.string().trim().min(1, "Please select a test."),
    mode: z.enum(["single", "multiple"]),
    assignee_id: z.string().trim().optional(),
    assignee_ids: z.array(z.string().trim().min(1)).default([]),
    due_at: z.string().trim().optional().nullable(),
    max_attempts: z.coerce
      .number()
      .int("Max attempts must be an integer.")
      .min(1, "Max attempts must be at least 1."),
    access_type: z.enum(["account", "token"]),
    status: z.enum(["assigned", "started", "completed", "expired", "archived"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "single" && !value.assignee_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignee_id"],
        message: "Please select an assignee.",
      });
    }

    if (value.mode === "multiple" && value.assignee_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignee_ids"],
        message: "Please select at least one assignee.",
      });
    }
  });

type AssignmentFieldErrors = Partial<
  Record<
    | "test_id"
    | "assignee_id"
    | "assignee_ids"
    | "due_at"
    | "max_attempts"
    | "access_type"
    | "status",
    string
  >
>;

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

function canLaunchAssignment(assignment: Assignment) {
  return assignment.status === "assigned" || assignment.status === "started";
}

function getAttemptActionLabel(assignment: Assignment) {
  return assignment.status === "started" ? "Continue attempt" : "Start attempt";
}

function getStudentActionLabel(assignment: Assignment) {
  switch (assignment.status) {
    case "started":
      return "Continue";
    case "completed":
      return "Submitted";
    case "expired":
      return "Closed";
    case "archived":
      return "Archived";
    default:
      return "Start";
  }
}

function getStudentStatusLabel(assignment: Assignment) {
  switch (assignment.status) {
    case "assigned":
      return "Ready";
    case "started":
      return "In progress";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "archived":
      return "Archived";
    default:
      return assignment.status;
  }
}

function formatRelativeDueDate(value?: string | null) {
  if (!value) return "No due date";

  const dueAt = new Date(value).getTime();
  if (Number.isNaN(dueAt)) return formatDateTimeForDisplay(value);

  const diffMs = dueAt - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return diffMs >= 0 ? "Due now" : "Just missed";
  if (absMinutes < 60) return diffMs >= 0 ? `Due in ${absMinutes}m` : `Overdue by ${absMinutes}m`;

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) return diffMs >= 0 ? `Due in ${hours}h` : `Overdue by ${hours}h`;

  const days = Math.round(hours / 24);
  return diffMs >= 0 ? `Due in ${days}d` : `Overdue by ${days}d`;
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
  const base = {
    test_id: form.test_id.trim(),
    due_at: formatDateTimeForApi(form.due_at),
    max_attempts: Number(form.max_attempts),
    access_type: form.access_type,
  };

  if (form.mode === "multiple") {
    return {
      ...base,
      assignee_ids: form.assignee_ids.map((id) => id.trim()).filter(Boolean),
    };
  }

  return {
    ...base,
    assignee_id: form.assignee_id.trim(),
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
  const score =
    latestAttempt?.total_score ??
    getNumberField(assignment, ["total_score", "score", "final_score"]);
  const isFinalized = latestAttempt?.is_finalized ?? getBooleanField(assignment, ["is_finalized"]);
  const isPassed = latestAttempt?.is_passed ?? getBooleanField(assignment, ["is_passed"]);
  const canLaunch = canLaunchAssignment(assignment);
  const attemptActionLabel = getAttemptActionLabel(assignment);

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
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {assignment.test_id}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Result</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{score == null ? "—" : score}</span>
            <span className="text-xs text-muted-foreground">
              {isFinalized ? "finalized" : "not finalized"}
            </span>
          </div>
          {isPassed != null && (
            <Badge
              variant="outline"
              className={
                isPassed
                  ? "mt-2 border-success/30 bg-success/15 text-success"
                  : "mt-2 border-destructive/30 bg-destructive/10 text-destructive"
              }
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
          <DetailRow
            label="Status"
            value={
              <Badge variant="outline" className={statusTone(assignment.status)}>
                {assignment.status}
              </Badge>
            }
          />
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
        {!canManageAssignments && canLaunch && (
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onStartAttempt}
          >
            <PlayCircle className="mr-1.5 h-4 w-4" />
            {attemptActionLabel}
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

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
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
        total_score:
          typeof item.total_score === "number"
            ? item.total_score
            : getNumberField(item, ["score", "final_score"]),
        auto_score: typeof item.auto_score === "number" ? item.auto_score : null,
        manual_score: typeof item.manual_score === "number" ? item.manual_score : null,
        is_passed: typeof item.is_passed === "boolean" ? item.is_passed : null,
        is_finalized: typeof item.is_finalized === "boolean" ? item.is_finalized : null,
      };
    })
    .filter((attempt) => attempt.id);
}

function StudentAssignmentsView({
  assignments,
  isLoading,
  page,
  lastPage,
  total,
  onRefresh,
  onStartAttempt,
}: {
  assignments: Assignment[];
  isLoading: boolean;
  page: number;
  lastPage: number;
  total: number;
  onRefresh: () => void;
  onStartAttempt: (assignment: Assignment) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "closed">("all");

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((left, right) => {
      const leftPriority = canLaunchAssignment(left) ? 0 : left.status === "completed" ? 1 : 2;
      const rightPriority = canLaunchAssignment(right) ? 0 : right.status === "completed" ? 1 : 2;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      const leftDue = left.due_at ? new Date(left.due_at).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.due_at ? new Date(right.due_at).getTime() : Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) return leftDue - rightDue;

      return getTestLabel(left).localeCompare(getTestLabel(right));
    });
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedAssignments.filter((assignment) => {
      const matchesTerm =
        !term ||
        [
          getTestLabel(assignment),
          getStudentStatusLabel(assignment),
          assignment.access_type,
          assignment.due_at,
          assignment.test_id,
        ].some((value) => typeof value === "string" && value.toLowerCase().includes(term));

      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "active" && canLaunchAssignment(assignment)) ||
        (statusFilter === "completed" && assignment.status === "completed") ||
        (statusFilter === "closed" &&
          (assignment.status === "expired" || assignment.status === "archived"));

      return matchesTerm && matchesFilter;
    });
  }, [searchTerm, sortedAssignments, statusFilter]);

  const counts = useMemo(() => {
    const dueSoonWindow = 1000 * 60 * 60 * 24 * 3;
    const now = Date.now();

    return {
      active: assignments.filter((assignment) => canLaunchAssignment(assignment)).length,
      completed: assignments.filter((assignment) => assignment.status === "completed").length,
      dueSoon: assignments.filter((assignment) => {
        if (!assignment.due_at || !canLaunchAssignment(assignment)) return false;
        const dueAt = new Date(assignment.due_at).getTime();
        return dueAt >= now && dueAt - now <= dueSoonWindow;
      }).length,
    };
  }, [assignments]);

  const featuredAssignment = useMemo(
    () => sortedAssignments.find((assignment) => canLaunchAssignment(assignment)) ?? null,
    [sortedAssignments],
  );

  const visibleActiveAssignments = filteredAssignments.filter((assignment) => canLaunchAssignment(assignment));
  const visibleCompletedAssignments = filteredAssignments.filter(
    (assignment) => assignment.status === "completed",
  );
  const visibleClosedAssignments = filteredAssignments.filter(
    (assignment) => assignment.status === "expired" || assignment.status === "archived",
  );

  return (
    <AppLayout
      breadcrumbs={[{ label: "Assignments" }, { label: "My work" }]}
      title="Student home"
      description="Your tests, progress, and next action in one focused workspace."
      actions={
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <Card className="overflow-hidden border-brand/20 bg-[radial-gradient(circle_at_top_left,rgba(245,179,1,0.22),transparent_35%),linear-gradient(180deg,rgba(20,18,14,0.98),rgba(14,14,16,0.96))] text-white shadow-lg">
          <div className="flex h-full flex-col gap-6 p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <GraduationCap className="h-3.5 w-3.5 text-brand" />
              Student home
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                A clean, exam-first home for everything you need to do next.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                Continue active work, jump into new tests, and keep completed items out of the way.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Ready now" value={counts.active} />
              <MetricCard label="Due soon" value={counts.dueSoon} />
              <MetricCard label="Completed" value={counts.completed} />
            </div>

            {featuredAssignment && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                      Continue now
                    </div>
                    <h3 className="mt-1 truncate text-xl font-semibold">
                      {getTestLabel(featuredAssignment)}
                    </h3>
                    <p className="mt-1 text-sm text-white/70">
                      {formatRelativeDueDate(featuredAssignment.due_at)}
                    </p>
                  </div>
                  <Button
                    className="bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={() => onStartAttempt(featuredAssignment)}
                  >
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Resume
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-brand/15 text-foreground">
                <Trophy className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Your flow</div>
                <div className="text-xs text-muted-foreground">Simple, exam-first navigation</div>
              </div>
            </div>

            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Open a card to continue or start.",
                "Keep due work visible at the top.",
                "Completed tests stay grouped below.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3 rounded-md border bg-muted/20 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-dashed p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Overview</div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="text-sm font-medium">Assignments visible</div>
                <div className="mt-1 text-2xl font-semibold">{filteredAssignments.length}</div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="text-sm font-medium">Page</div>
                <div className="mt-1 text-2xl font-semibold">
                  {page}/{lastPage}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search tests, status, or due dates..."
            className="h-11 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All", count: assignments.length },
            { key: "active", label: "Active", count: counts.active },
            { key: "completed", label: "Completed", count: counts.completed },
            {
              key: "closed",
              label: "Closed",
              count: assignments.filter((assignment) => assignment.status === "expired" || assignment.status === "archived").length,
            },
          ].map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={statusFilter === item.key ? "default" : "outline"}
              size="sm"
              className={statusFilter === item.key ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""}
              onClick={() => setStatusFilter(item.key as typeof statusFilter)}
            >
              {item.label}
              <Badge variant="secondary" className="ml-2 bg-background/80">
                {item.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-20 animate-pulse rounded-xl bg-muted/70" />
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card className="mt-4 border-dashed p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/15">
            <FileStack className="h-6 w-6 text-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {searchTerm.trim() || statusFilter !== "all"
              ? "No matching assignments"
              : "No assignments yet"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm.trim() || statusFilter !== "all"
              ? "Try a different keyword or clear the filters."
              : "When your teacher assigns a test, it will appear here."}
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {visibleActiveAssignments.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Continue or start
                </h3>
                <Badge variant="secondary">{visibleActiveAssignments.length}</Badge>
              </div>
              {visibleActiveAssignments.map((assignment) => (
                <StudentAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onStartAttempt={onStartAttempt}
                  accent="ready"
                />
              ))}
            </section>
          )}

          {visibleCompletedAssignments.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed
                </h3>
                <Badge variant="secondary">{visibleCompletedAssignments.length}</Badge>
              </div>
              {visibleCompletedAssignments.map((assignment) => (
                <StudentAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onStartAttempt={onStartAttempt}
                  accent="done"
                />
              ))}
            </section>
          )}

          {visibleClosedAssignments.length > 0 && (
            <section className="space-y-3 xl:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Closed
                </h3>
                <Badge variant="secondary">{visibleClosedAssignments.length}</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleClosedAssignments.map((assignment) => (
                  <StudentAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onStartAttempt={onStartAttempt}
                    accent="archived"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StudentAssignmentCard({
  assignment,
  onStartAttempt,
  accent,
}: {
  assignment: Assignment;
  onStartAttempt: (assignment: Assignment) => void;
  accent: "ready" | "done" | "archived";
}) {
  const canStart = canLaunchAssignment(assignment);
  const dueLabel = formatRelativeDueDate(assignment.due_at);

  return (
    <Card
      className={
        "p-5 transition hover:shadow-lg " +
        (accent === "ready"
          ? "border-brand/20 bg-[linear-gradient(180deg,rgba(245,179,1,0.08),rgba(245,179,1,0.02))]"
          : accent === "done"
            ? "border-success/20 bg-[linear-gradient(180deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))]"
            : "border-border/70 bg-muted/20")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {getStudentStatusLabel(assignment)}
          </div>
          <h4 className="mt-1 truncate text-lg font-semibold">{getTestLabel(assignment)}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {dueLabel}
          </p>
        </div>
        <Badge variant="outline" className={statusTone(assignment.status)}>
          {getStudentStatusLabel(assignment)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoChip label="Attempts" value={String(assignment.current_attempts ?? 0)} />
        <InfoChip label="Max attempts" value={String(assignment.max_attempts)} />
        <InfoChip label="Access" value={assignment.access_type} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {canStart
            ? "Open the exam when you are ready."
            : assignment.status === "completed"
              ? "This assignment is already completed."
              : "This assignment is no longer active."}
        </div>
        <Button
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={!canStart}
          onClick={() => onStartAttempt(assignment)}
        >
          <PlayCircle className="mr-1.5 h-4 w-4" />
          {getStudentActionLabel(assignment)}
        </Button>
      </div>
    </Card>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authQuery = useAuthContextQuery();
  const canManageAssignments = hasPermission(authQuery.data, "assignments:create");
  const canViewAssignments = hasPermission(authQuery.data, ["assignments:create", "assignments:view"]);
  const canReview = hasPermission(authQuery.data, "grading:view-pending");
  const canViewReports = hasPermission(authQuery.data, ["reports:view", "grading:view-pending"]);

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
  const [createdTokens, setCreatedTokens] = useState<Record<string, string> | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyResult, setVerifyResult] = useState("");
  const [verifiedAssignment, setVerifiedAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<AssignmentFieldErrors>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");

  const testsQuery = useQuery({
    queryKey: ["tests", "published"],
    queryFn: () => listAllTests({ status: "published" }),
    enabled: canManageAssignments,
    staleTime: 30_000,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStudentSearch(studentSearch.trim());
      setStudentPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  const studentsQuery = useQuery({
    queryKey: ["assignments", "selectable-students", studentPage, debouncedStudentSearch],
    queryFn: () =>
      listSelectableStudents({
        page: studentPage,
        per_page: 15,
        search: debouncedStudentSearch || undefined,
      }),
    enabled: canManageAssignments && formOpen,
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
  const students = studentsQuery.data?.items ?? [];
  const studentTotal = studentsQuery.data?.total ?? 0;
  const studentLastPage = studentsQuery.data?.lastPage ?? 1;

  const loadAssignments = useCallback(
    async (nextPage = page, nextAssigneeFilter = appliedAssigneeFilter) => {
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
    },
    [appliedAssigneeFilter, canManageAssignments, page],
  );

  function validateAssignmentForm() {
    const parsed = assignmentSchema.safeParse({
      test_id: form.test_id,
      mode: form.mode,
      assignee_id: form.assignee_id,
      assignee_ids: form.assignee_ids,
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
  }, [loadAssignments]);

  function openCreateDialog() {
    setEditingAssignment(null);
    setCreatedToken(null);
    setCreatedTokens(null);
    setForm(initialForm);
    setFormErrors({});
    setStudentSearch("");
    setStudentPage(1);
    setDebouncedStudentSearch("");
    setFormOpen(true);
  }

  function openEditDialog(assignment: Assignment) {
    setEditingAssignment(assignment);
    setCreatedToken(null);
    setCreatedTokens(null);
    setForm({
      test_id: assignment.test_id,
      assignee_id: assignment.assignee_id,
      assignee_ids: [],
      due_at: formatDateTimeForInput(assignment.due_at),
      max_attempts: String(assignment.max_attempts),
      access_type: assignment.access_type,
      status: assignment.status,
      mode: "single",
    });
    setFormErrors({});
    setStudentSearch("");
    setStudentPage(1);
    setDebouncedStudentSearch("");
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
        setCreatedToken(result.access_token ?? result.access_tokens[form.assignee_id] ?? null);
        setCreatedTokens(
          Object.keys(result.access_tokens).length > 0 ? result.access_tokens : null,
        );
        if (result.assignments.length > 1) {
          toast.success(`Created ${result.assignments.length} assignments successfully.`);
        } else {
          toast.success("Assignment created successfully.");
        }
      }

      await loadAssignments(page, appliedAssigneeFilter);
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
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
        attempt && typeof attempt === "object" && "id" in attempt
          ? String((attempt as { id: unknown }).id)
          : "";

      toast.success(assignment.status === "started" ? "Attempt resumed." : "Attempt started.");
      await loadAssignments(page, appliedAssigneeFilter);
      navigate({
        to: "/exam",
        search: attemptId ? ({ attemptId } as never) : ({ attemptId: undefined } as never),
      });
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
    setVerifiedAssignment(null);

    try {
      const result = await verifyAssignmentToken(verifyToken.trim());
      setVerifiedAssignment(result);
      setVerifyResult(
        JSON.stringify(
          {
            id: result.id,
            status: result.status,
            test: getTestLabel(result),
            assignee: getAssigneeLabel(result),
            due_at: result.due_at,
            access_type: result.access_type,
            max_attempts: result.max_attempts,
          },
          null,
          2,
        ),
      );
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
  const selectedAssignee = students.find((user) => user.id === form.assignee_id);
  const selectedAssignees =
    form.mode === "multiple" ? students.filter((user) => form.assignee_ids.includes(user.id)) : [];

  if (!canManageAssignments) {
    return (
      <StudentAssignmentsView
        assignments={assignments}
        isLoading={isLoading}
        page={page}
        lastPage={lastPage}
        total={total}
        onRefresh={() => loadAssignments(page, appliedAssigneeFilter)}
        onStartAttempt={(assignment) => void handleStartAttempt(assignment)}
      />
    );
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Assignments" }, { label: "Active" }]}
      title={canManageAssignments ? "Assignments" : canViewAssignments ? "My assignments" : "Assignments"}
      description={
        canManageAssignments
          ? "Distribute published tests to students, manage lifecycle status, and verify assignment access tokens."
          : "Open assigned tests, continue in-progress attempts, or verify a token-based assignment."
      }
      actions={
        canManageAssignments ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>
              <Key className="mr-1.5 h-4 w-4" /> Verify token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAssignments(page, appliedAssigneeFilter)}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={openCreateDialog}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Assign test
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>
              <Key className="mr-1.5 h-4 w-4" /> Verify token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAssignments(page, appliedAssigneeFilter)}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
          </>
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
          <form
            className="flex flex-wrap items-center gap-2 border-b p-3"
            onSubmit={applyAssigneeFilter}
          >
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
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {assignment.test_id}
                      </div>
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
                          {!canManageAssignments && canLaunchAssignment(assignment) && (
                            <DropdownMenuItem onClick={() => void handleStartAttempt(assignment)}>
                              <PlayCircle className="h-4 w-4" /> {getAttemptActionLabel(assignment)}
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
        <Link to="/exam" search={{ attemptId: undefined }} className="font-medium underline">
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
              <Label>Assignment mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.mode === "single" ? "default" : "outline"}
                  className={
                    form.mode === "single" ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""
                  }
                  onClick={() => {
                    setForm((current) => ({ ...current, mode: "single", assignee_ids: [] }));
                    setFormErrors((current) => ({
                      ...current,
                      assignee_id: undefined,
                      assignee_ids: undefined,
                    }));
                  }}
                >
                  One student
                </Button>
                <Button
                  type="button"
                  variant={form.mode === "multiple" ? "default" : "outline"}
                  className={
                    form.mode === "multiple"
                      ? "bg-brand text-brand-foreground hover:bg-brand/90"
                      : ""
                  }
                  onClick={() => {
                    setForm((current) => ({ ...current, mode: "multiple", assignee_id: "" }));
                    setFormErrors((current) => ({
                      ...current,
                      assignee_id: undefined,
                      assignee_ids: undefined,
                    }));
                  }}
                >
                  Multiple students
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Chọn một học sinh để dùng `assignee_id`, hoặc chọn nhiều học sinh để gửi
                `assignee_ids[]`.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="test_id">Test</Label>
              <Select
                value={form.test_id}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, test_id: value }));
                  setFormErrors((current) => ({ ...current, test_id: undefined }));
                }}
              >
                <SelectTrigger
                  id="test_id"
                  className={formErrors.test_id ? "border-destructive focus:ring-destructive" : ""}
                >
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
              {formErrors.test_id && (
                <p className="text-xs text-destructive">{formErrors.test_id}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student_search">Selectable students</Label>
              <Input
                id="student_search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search by email or display name..."
              />
              <p className="text-xs text-muted-foreground">
                {studentsQuery.isFetching
                  ? "Đang tải danh sách học sinh..."
                  : studentTotal > 0
                    ? `Tìm thấy ${studentTotal} học sinh phù hợp.`
                    : "Không có học sinh phù hợp."}
              </p>
            </div>

            {form.mode === "single" ? (
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <div className="max-h-64 overflow-auto rounded-md border p-3">
                  <div className="grid gap-2">
                    {students.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Không có học sinh phù hợp
                      </div>
                    ) : (
                      students.map((student: UserResource) => {
                        const selected = form.assignee_id === student.id;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({ ...current, assignee_id: student.id }));
                              setFormErrors((current) => ({ ...current, assignee_id: undefined }));
                            }}
                            className={
                              "flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted/30 " +
                              (selected ? "border-brand bg-brand/10" : "bg-background")
                            }
                          >
                            <input
                              type="radio"
                              className="mt-1 h-4 w-4"
                              checked={selected}
                              readOnly
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">{student.display_name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {student.email}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {studentPage} of {studentLastPage}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={studentPage <= 1 || studentsQuery.isFetching}
                      onClick={() => setStudentPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={studentPage >= studentLastPage || studentsQuery.isFetching}
                      onClick={() => setStudentPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                {formErrors.assignee_id && (
                  <p className="text-xs text-destructive">{formErrors.assignee_id}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Assignees</Label>
                <div className="max-h-64 overflow-auto rounded-md border p-3">
                  <div className="grid gap-2">
                    {students.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Không có học sinh phù hợp
                      </div>
                    ) : (
                      students.map((student: UserResource) => {
                        const checked = form.assignee_ids.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/30"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked}
                              onChange={(event) => {
                                const nextIds = event.target.checked
                                  ? [...form.assignee_ids, student.id]
                                  : form.assignee_ids.filter((id) => id !== student.id);
                                setForm((current) => ({ ...current, assignee_ids: nextIds }));
                                setFormErrors((current) => ({ ...current, assignee_ids: undefined }));
                              }}
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">{student.display_name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {student.email}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {studentPage} of {studentLastPage}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={studentPage <= 1 || studentsQuery.isFetching}
                      onClick={() => setStudentPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={studentPage >= studentLastPage || studentsQuery.isFetching}
                      onClick={() => setStudentPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                {formErrors.assignee_ids && (
                  <p className="text-xs text-destructive">{formErrors.assignee_ids}</p>
                )}
              </div>
            )}

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
                  className={
                    formErrors.due_at ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                {formErrors.due_at && (
                  <p className="text-xs text-destructive">{formErrors.due_at}</p>
                )}
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
                  className={
                    formErrors.max_attempts
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {formErrors.max_attempts && (
                  <p className="text-xs text-destructive">{formErrors.max_attempts}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Access type</Label>
              <Select
                value={form.access_type}
                onValueChange={(value) => {
                  setForm((current) => ({
                    ...current,
                    access_type: value as AssignmentAccessType,
                  }));
                  setFormErrors((current) => ({ ...current, access_type: undefined }));
                }}
              >
                <SelectTrigger
                  className={
                    formErrors.access_type ? "border-destructive focus:ring-destructive" : ""
                  }
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">token</SelectItem>
                  <SelectItem value="account">account</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.access_type && (
                <p className="text-xs text-destructive">{formErrors.access_type}</p>
              )}
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
                  <SelectTrigger
                    className={formErrors.status ? "border-destructive focus:ring-destructive" : ""}
                  >
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
                {formErrors.status && (
                  <p className="text-xs text-destructive">{formErrors.status}</p>
                )}
              </div>
            )}

            {(createdToken || createdTokens) && form.access_type === "token" && (
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Access token
                </div>
                {createdTokens ? (
                  <div className="mt-2 grid gap-2">
                    {Object.entries(createdTokens).map(([assigneeId, token]) => (
                      <div key={assigneeId} className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 rounded bg-background px-2 py-1 text-xs">
                          {token}
                        </code>
                        <span className="text-[11px] text-muted-foreground">{assigneeId}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            void navigator.clipboard.writeText(token);
                            toast.success("Token copied.");
                          }}
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 rounded bg-background px-2 py-1 text-xs">
                      {createdToken}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        void navigator.clipboard.writeText(createdToken ?? "");
                        toast.success("Token copied.");
                      }}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Selected values</div>
              <div className="mt-1">Test: {selectedTest?.title ?? "—"}</div>
              {form.mode === "single" ? (
                <div>
                  Assignee:{" "}
                  {selectedAssignee
                    ? `${selectedAssignee.display_name} (${selectedAssignee.email})`
                    : "—"}
                </div>
              ) : (
                <div>
                  Assignees:{" "}
                  {selectedAssignees.length > 0
                    ? selectedAssignees.map((user) => user.display_name).join(", ")
                    : "—"}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
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
            <DialogDescription>
              Check whether an assignment access token is valid and preview the linked assignment.
            </DialogDescription>
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
            {verifyResult && (
              <Textarea value={verifyResult} readOnly className="min-h-40 font-mono text-xs" />
            )}
            {verifiedAssignment && (
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{getTestLabel(verifiedAssignment)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getAssigneeLabel(verifiedAssignment)} · {formatDateTimeForDisplay(verifiedAssignment.due_at)}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusTone(verifiedAssignment.status)}>
                    {verifiedAssignment.status}
                  </Badge>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVerifyOpen(false)}>
                Close
              </Button>
              {verifiedAssignment && canLaunchAssignment(verifiedAssignment) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleStartAttempt(verifiedAssignment)}
                >
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  {getAttemptActionLabel(verifiedAssignment)}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isVerifying}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
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
            <DialogDescription>
              Test, assignee, lifecycle, and available scoring information.
            </DialogDescription>
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
