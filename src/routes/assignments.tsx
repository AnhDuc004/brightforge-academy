import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  Clipboard,
  Eye,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
import {
  type Assignment,
  type AssignmentPayload,
  type AssignmentStatus,
  createAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  updateAssignment,
  verifyAssignmentToken,
} from "@/lib/assignments";
import { parseApiError } from "@/lib/auth";

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
  user_id: "",
  due_date: "",
  max_attempts: "3",
  status: "assigned" as AssignmentStatus,
};

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
  if (!value) return "";
  return `${value.replace("T", " ")}:00`;
}

function formatDateTimeForDisplay(value?: string | null) {
  if (!value) return "No due date";
  return value.replace("T", " ").slice(0, 19);
}

function getAssigneeLabel(assignment: Assignment) {
  return (
    assignment.user?.display_name ||
    assignment.user?.name ||
    assignment.user?.email ||
    assignment.user_id
  );
}

function getTestLabel(assignment: Assignment) {
  return assignment.test?.title || assignment.test?.name || assignment.test_id;
}

function buildPayload(form: typeof initialForm): AssignmentPayload {
  return {
    test_id: form.test_id.trim(),
    user_id: form.user_id.trim(),
    due_date: formatDateTimeForApi(form.due_date),
    max_attempts: Number(form.max_attempts),
  };
}

function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userFilter, setUserFilter] = useState("");
  const [appliedUserFilter, setAppliedUserFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyResult, setVerifyResult] = useState("");
  const [form, setForm] = useState(initialForm);

  const stats = useMemo(
    () =>
      assignmentStatuses.map((status) => ({
        status,
        value: assignments.filter((assignment) => assignment.status === status).length,
      })),
    [assignments],
  );

  async function loadAssignments(nextPage = page, nextUserFilter = appliedUserFilter) {
    setIsLoading(true);

    try {
      const result = await listAssignments({
        page: nextPage,
        per_page: 10,
        user_id: nextUserFilter,
      });

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

  useEffect(() => {
    void loadAssignments(1, "");
  }, []);

  function openCreateDialog() {
    setEditingAssignment(null);
    setCreatedToken(null);
    setForm(initialForm);
    setFormOpen(true);
  }

  function openEditDialog(assignment: Assignment) {
    setEditingAssignment(assignment);
    setCreatedToken(null);
    setForm({
      test_id: assignment.test_id,
      user_id: assignment.user_id,
      due_date: formatDateTimeForInput(assignment.due_date),
      max_attempts: String(assignment.max_attempts),
      status: assignment.status,
    });
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
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

      await loadAssignments(page, appliedUserFilter);
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
      await loadAssignments(page, appliedUserFilter);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  }

  async function handleArchive(assignment: Assignment) {
    try {
      await updateAssignment(assignment.id, { status: "archived" });
      toast.success("Assignment archived.");
      await loadAssignments(page, appliedUserFilter);
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

  function applyUserFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedUserFilter(userFilter.trim());
    void loadAssignments(1, userFilter.trim());
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Assignments" }, { label: "Active" }]}
      title="Assignments"
      description="Distribute published tests to students, manage lifecycle status, and verify assignment access tokens."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>
            <Key className="mr-1.5 h-4 w-4" /> Verify token
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadAssignments(page, appliedUserFilter)}>
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
        <form className="flex flex-wrap items-center gap-2 border-b p-3" onSubmit={applyUserFilter}>
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="Filter by user ID"
              className="h-9 pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
          {appliedUserFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserFilter("");
                setAppliedUserFilter("");
                void loadAssignments(1, "");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Test</th>
                <th className="px-4 py-2.5 text-left font-medium">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium">Due date</th>
                <th className="px-4 py-2.5 text-left font-medium">Attempts</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
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
                        {assignment.user_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDateTimeForDisplay(assignment.due_date)}</td>
                    <td className="px-4 py-3">
                      {assignment.current_attempts}/{assignment.max_attempts}
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
                          <DropdownMenuItem onClick={() => handleView(assignment)}>
                            <Eye className="h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(assignment)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(assignment)}>
                            <Archive className="h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(assignment)}
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
            Page {page} of {lastPage} · {total} total
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page <= 1}
              onClick={() => loadAssignments(page - 1, appliedUserFilter)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={isLoading || page >= lastPage}
              onClick={() => loadAssignments(page + 1, appliedUserFilter)}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit assignment" : "Assign test"}</DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? "Update assignment settings and lifecycle status."
                : "Create an assignment for a user and generate an access token."}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="test_id">Test ID</Label>
              <Input
                id="test_id"
                value={form.test_id}
                onChange={(event) => setForm((current) => ({ ...current, test_id: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user_id">User ID</Label>
              <Input
                id="user_id"
                value={form.user_id}
                onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_attempts">Max attempts</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min="1"
                  value={form.max_attempts}
                  onChange={(event) => setForm((current) => ({ ...current, max_attempts: event.target.value }))}
                  required
                />
              </div>
            </div>

            {editingAssignment && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as AssignmentStatus }))
                  }
                >
                  <SelectTrigger>
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
              </div>
            )}

            {createdToken && (
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Access token
                </div>
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
                      void navigator.clipboard.writeText(createdToken);
                      toast.success("Token copied.");
                    }}
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment details</DialogTitle>
            <DialogDescription>Fetched from GET /api/v1/assignments/{selectedAssignment?.id || "id"}.</DialogDescription>
          </DialogHeader>
          {selectedAssignment ? (
            <Textarea
              value={JSON.stringify(selectedAssignment, null, 2)}
              readOnly
              className="min-h-80 font-mono text-xs"
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
