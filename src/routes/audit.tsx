import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  Shield,
  FileSearch,
  Clock3,
  Globe,
  Copy,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listAuditLogs, type AuditLogResource } from "@/lib/audit";
import { parseApiError } from "@/lib/auth";

const ACTION_OPTIONS = [
  "question.created",
  "question.published",
  "question.archived",
  "test.published",
  "assignment.created",
  "attempt.submitted",
  "attempt.force_submitted",
  "answer.reviewed",
  "attempt.finalized",
];

const RESOURCE_OPTIONS = ["question", "test", "attempt", "answer", "assignment"];

const ACTION_TONES: Record<string, string> = {
  "question.created": "bg-info/15 text-info border-info/30",
  "question.published": "bg-success/15 text-success border-success/30",
  "question.archived": "bg-muted text-muted-foreground border-border",
  "test.published": "bg-brand/15 border-brand/40",
  "assignment.created": "bg-info/15 text-info border-info/30",
  "attempt.submitted": "bg-accent border-border",
  "attempt.force_submitted": "bg-destructive/10 text-destructive border-destructive/30",
  "answer.reviewed": "bg-muted text-muted-foreground border-border",
  "attempt.finalized": "bg-success/15 text-success border-success/30",
};

type SearchParams = {
  page?: number;
  per_page?: number;
  action?: string;
  resource_type?: string;
};

export const Route = createFileRoute("/audit")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const page = typeof search.page === "number" && search.page > 0 ? Math.floor(search.page) : 1;
    const perPage =
      typeof search.per_page === "number" && search.per_page > 0 ? Math.floor(search.per_page) : 15;
    const action = typeof search.action === "string" && search.action.trim() ? search.action.trim() : undefined;
    const resourceType =
      typeof search.resource_type === "string" && search.resource_type.trim()
        ? search.resource_type.trim()
        : undefined;

    return {
      page,
      per_page: perPage,
      action,
      resource_type: resourceType,
    };
  },
  head: () => ({ meta: [{ title: "Audit logs · ExamForge" }] }),
  component: AuditPage,
});

function AuditPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogResource | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const auditQuery = useQuery({
    queryKey: ["audit-logs", search.page, search.per_page, search.action ?? "", search.resource_type ?? ""],
    queryFn: () =>
      listAuditLogs({
        page: search.page,
        per_page: search.per_page,
        action: search.action,
        resource_type: search.resource_type,
      }),
    staleTime: 30_000,
    retry: false,
  });

  const logs = auditQuery.data?.items ?? [];
  const total = auditQuery.data?.total ?? 0;
  const page = auditQuery.data?.page ?? search.page ?? 1;
  const perPage = auditQuery.data?.perPage ?? search.per_page ?? 15;
  const lastPage = auditQuery.data?.lastPage ?? 1;
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      const haystacks = [
        log.actor?.display_name,
        log.actor?.email,
        log.action,
        log.resource_type,
        log.resource_id,
        log.ip,
      ].filter((value): value is string => typeof value === "string" && value.length > 0);

      return haystacks.some((value) => value.toLowerCase().includes(term));
    });
  }, [logs, searchTerm]);

  const pageLabel = useMemo(
    () => (auditQuery.data ? `${auditQuery.data.from ?? 0} - ${auditQuery.data.to ?? 0}` : "0"),
    [auditQuery.data],
  );

  const summary = {
    total,
    visible: filteredLogs.length,
    page,
    lastPage,
  };

  function updateSearch(next: Partial<SearchParams>) {
    void navigate({
      search: {
        page: next.page ?? search.page ?? 1,
        per_page: next.per_page ?? search.per_page ?? 15,
        action: next.action ?? search.action,
        resource_type: next.resource_type ?? search.resource_type,
      },
      replace: true,
    });
  }

  function openDetail(log: AuditLogResource) {
    setSelectedLog(log);
    setCopyState("idle");
    setDetailOpen(true);
  }

  async function copyMetadata(log: AuditLogResource | null) {
    if (!log) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(log.metadata ?? {}, null, 2));
      setCopyState("copied");
      toast.success("Metadata copied.");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      toast.error("Unable to copy metadata.");
    }
  }

  function exportCsv() {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs to export.");
      return;
    }

    const headers = ["created_at", "actor", "action", "resource_type", "resource_id", "ip", "metadata"];
    const rows = filteredLogs.map((log) => [
      log.created_at,
      log.actor?.display_name ?? log.actor?.email ?? "Unknown actor",
      log.action,
      log.resource_type,
      log.resource_id ?? "",
      log.ip ?? "",
      JSON.stringify(log.metadata ?? {}),
    ]);

    const escapeCell = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCell(String(cell ?? ""))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
      title="Audit logs"
      description="Track important tenant events, inspect who did what, and review metadata for sensitive actions."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", auditQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-4 lg:col-span-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total logs</div>
          <div className="mt-2 text-2xl font-semibold">{summary.total.toLocaleString()}</div>
          <div className="mt-1 text-xs text-muted-foreground">Current tenant only</div>
        </Card>
        <Card className="p-4 lg:col-span-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Shown on page</div>
          <div className="mt-2 text-2xl font-semibold">{summary.visible}</div>
          <div className="mt-1 text-xs text-muted-foreground">Page {summary.page} of {summary.lastPage}</div>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current filter</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{search.action ?? "All actions"}</Badge>
            <Badge variant="outline">{search.resource_type ?? "All resource types"}</Badge>
            <Badge variant="outline">{perPage} per page</Badge>
            <Badge variant="outline">{pageLabel === "0" ? "No records" : `Rows ${pageLabel}`}</Badge>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search current page..."
              className="pl-8"
            />
          </div>
          <Select
            value={search.action ?? "all"}
            onValueChange={(value) => updateSearch({ action: value === "all" ? undefined : value, page: 1 })}
          >
            <SelectTrigger className="w-full lg:w-[210px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatActionLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.resource_type ?? "all"}
            onValueChange={(value) => updateSearch({ resource_type: value === "all" ? undefined : value, page: 1 })}
          >
            <SelectTrigger className="w-full lg:w-[190px]">
              <SelectValue placeholder="Resource type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resource types</SelectItem>
              {RESOURCE_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatResourceTypeLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.per_page?.toString() ?? "15"}
            onValueChange={(value) => updateSearch({ per_page: Number(value), page: 1 })}
          >
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder="Per page" />
            </SelectTrigger>
            <SelectContent>
              {[15, 25, 50].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => updateSearch({ page: 1, action: undefined, resource_type: undefined })}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Clear filters
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5" />
              Audit trail
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>

          {auditQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="grid grid-cols-6 gap-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : auditQuery.isError ? (
            <div className="p-6 text-sm text-destructive">
              {parseApiError(auditQuery.error).message}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="mx-auto h-8 w-8 text-brand" />
              <h3 className="mt-3 text-base font-semibold">No audit logs found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different action, resource type, or search term.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Time</th>
                      <th className="text-left px-4 py-2.5 font-medium">Actor</th>
                      <th className="text-left px-4 py-2.5 font-medium">Action</th>
                      <th className="text-left px-4 py-2.5 font-medium">Resource type</th>
                      <th className="text-left px-4 py-2.5 font-medium">Resource ID</th>
                      <th className="text-left px-4 py-2.5 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => openDetail(log)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetail(log);
                          }
                        }}
                        className="cursor-pointer hover:bg-muted/30 focus:bg-muted/30 focus:outline-none"
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {log.actor?.display_name ?? log.actor?.email ?? "Unknown actor"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor?.email ?? log.actor_id ?? "No actor data"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("font-mono text-[10px]", ACTION_TONES[log.action])}>
                            {formatActionLabel(log.action)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{formatResourceTypeLabel(log.resource_type)}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {truncateId(log.resource_id)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            {log.ip ?? "—"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Page {page} of {lastPage} · {total} total
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page <= 1 || auditQuery.isFetching}
                    onClick={() => updateSearch({ page: page - 1 })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= lastPage || auditQuery.isFetching}
                    onClick={() => updateSearch({ page: page + 1 })}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">Event labels</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Actions are shown with friendly labels, while the raw action key remains available for filtering.
          </p>

          <div className="mt-4 space-y-2">
            {ACTION_OPTIONS.map((action) => (
              <div key={action} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{formatActionLabel(action)}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {action}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedLog(null);
            setCopyState("idle");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit log details</DialogTitle>
            <DialogDescription>
              Inspect who changed what, when it happened, and the backend metadata attached to the event.
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Time" value={formatDateTime(selectedLog.created_at)} />
                <DetailItem label="Action" value={formatActionLabel(selectedLog.action)} mono />
                <DetailItem label="Resource type" value={formatResourceTypeLabel(selectedLog.resource_type)} />
                <DetailItem label="Resource ID" value={selectedLog.resource_id ?? "—"} mono />
                <DetailItem
                  label="Actor"
                  value={selectedLog.actor?.display_name ?? selectedLog.actor?.email ?? "Unknown actor"}
                />
                <DetailItem label="IP" value={selectedLog.ip ?? "—"} />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs leading-relaxed">
                  {JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
                </pre>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyMetadata(selectedLog)}
                >
                  <Copy className="h-4 w-4" />
                  {copyState === "copied" ? "Copied" : "Copy metadata"}
                </Button>
                <Button
                  type="button"
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatResourceTypeLabel(value: string) {
  if (!value) return "Unknown";
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionLabel(action: string) {
  if (!action) return "Unknown action";

  const [resource, verb] = action.split(".");
  if (!resource || !verb) {
    return action
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const verbLabel = formatVerbLabel(verb);
  const resourceLabel = formatResourceTypeLabel(resource).toLowerCase();
  return `${verbLabel} ${resourceLabel}`;
}

function formatVerbLabel(value: string) {
  const normalized = value.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function truncateId(value: string | null) {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
