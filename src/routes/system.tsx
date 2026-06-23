import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { parseApiError } from "@/lib/auth";
import { tenantAdminApi, type TenantPayload, type TenantResource } from "@/lib/tenant-admin";
import { cn } from "@/lib/utils";

type SearchParams = { page?: number; per_page?: number };
type FormState = TenantPayload;

const EMPTY_FORM: FormState = { name: "", slug: "", plan: "free", is_active: true };
const PLAN_OPTIONS = ["free", "pro", "enterprise"];

export const Route = createFileRoute("/system")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    page: typeof search.page === "number" && search.page > 0 ? Math.floor(search.page) : 1,
    per_page:
      typeof search.per_page === "number" && search.per_page > 0 ? Math.floor(search.per_page) : 15,
  }),
  head: () => ({ meta: [{ title: "System Administration · ExamForge" }] }),
  component: SystemAdminPage,
});

function SystemAdminPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantResource | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantResource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ["system-admin", "tenants", search.page, search.per_page],
    queryFn: () => tenantAdminApi.list({ page: search.page, per_page: search.per_page }),
    staleTime: 15_000,
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ["system-admin", "tenant", selectedTenant?.id],
    queryFn: () => tenantAdminApi.get(selectedTenant!.id),
    enabled: detailOpen && Boolean(selectedTenant),
    retry: false,
  });

  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: ["system-admin", "tenants"] });

  const createMutation = useMutation({
    mutationFn: tenantAdminApi.create,
    onSuccess: () => {
      toast.success("Tenant created.");
      setFormOpen(false);
      void invalidateTenants();
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setFieldErrors(parsed.fieldErrors);
      toast.error(parsed.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TenantPayload }) => tenantAdminApi.update(id, payload),
    onSuccess: () => {
      toast.success("Tenant updated.");
      setFormOpen(false);
      void invalidateTenants();
      if (selectedTenant) void queryClient.invalidateQueries({ queryKey: ["system-admin", "tenant", selectedTenant.id] });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setFieldErrors(parsed.fieldErrors);
      toast.error(parsed.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tenantAdminApi.remove,
    onSuccess: () => {
      toast.success("Tenant deleted.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void invalidateTenants();
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const tenants = tenantsQuery.data?.items ?? [];
  const filteredTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesTerm = !term || [tenant.name, tenant.slug, tenant.plan ?? ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? tenant.is_active : !tenant.is_active);
      return matchesTerm && matchesStatus;
    });
  }, [searchTerm, statusFilter, tenants]);

  const page = tenantsQuery.data?.page ?? search.page ?? 1;
  const perPage = tenantsQuery.data?.perPage ?? search.per_page ?? 15;
  const lastPage = tenantsQuery.data?.lastPage ?? 1;
  const total = tenantsQuery.data?.total ?? 0;
  const activeCount = tenants.filter((tenant) => tenant.is_active).length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (page > lastPage && lastPage > 0) updateSearch({ page: lastPage });
  }, [lastPage, page]);

  function updateSearch(next: Partial<SearchParams>) {
    void navigate({
      search: {
        page: next.page ?? page,
        per_page: next.per_page ?? perPage,
      },
      replace: true,
    });
  }

  function openCreate() {
    setEditingTenant(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSlugManuallyEdited(false);
    setFormOpen(true);
  }

  function openEdit(tenant: TenantResource) {
    setEditingTenant(tenant);
    setForm({ name: tenant.name, slug: tenant.slug, plan: tenant.plan ?? "", is_active: tenant.is_active });
    setFieldErrors({});
    setSlugManuallyEdited(true);
    setFormOpen(true);
  }

  function setName(name: string) {
    setForm((current) => ({ ...current, name, slug: slugManuallyEdited ? current.slug : slugify(name) }));
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    const payload = { ...form, name: form.name.trim(), slug: form.slug.trim(), plan: form.plan.trim() || null };
    if (editingTenant) updateMutation.mutate({ id: editingTenant.id, payload });
    else createMutation.mutate(payload);
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "System Administration" }, { label: "Tenant Management" }]}
      title="Tenant Management"
      description="Manage every customer workspace from the global System Admin console. Changes here are not limited to the current tenant."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => tenantsQuery.refetch()} disabled={tenantsQuery.isFetching}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", tenantsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create tenant
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-brand/25 bg-[linear-gradient(135deg,rgba(245,179,1,0.12),transparent_60%)] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenant estate</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{total.toLocaleString()}</p>
            </div>
            <Building2 className="h-5 w-5 text-brand" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">All workspaces across the platform</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active on this page</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{activeCount}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{tenants.length - activeCount} inactive workspace{tenants.length - activeCount === 1 ? "" : "s"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Global access</p>
          <div className="mt-2 flex items-center gap-2"><Badge className="bg-success/15 text-success hover:bg-success/15">System Admin</Badge><span className="text-sm font-medium">tenant:manage</span></div>
          <p className="mt-3 text-xs text-muted-foreground">Tenant requests intentionally omit the tenant header.</p>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, slug, or plan on this page..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active only</SelectItem><SelectItem value="inactive">Inactive only</SelectItem></SelectContent>
          </Select>
          <Select value={String(perPage)} onValueChange={(value) => updateSearch({ page: 1, per_page: Number(value) })}>
            <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Rows" /></SelectTrigger>
            <SelectContent>{[15, 25, 50].map((value) => <SelectItem key={value} value={String(value)}>{value} per page</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/25 px-4 py-3">
          <div><p className="text-sm font-semibold">All tenants</p><p className="text-xs text-muted-foreground">{filteredTenants.length} visible on this page</p></div>
          <Badge variant="outline" className="font-mono text-[10px]">GLOBAL</Badge>
        </div>
        {tenantsQuery.isLoading ? <TenantTableSkeleton /> : tenantsQuery.isError ? (
          <div className="p-8 text-center"><p className="font-medium text-destructive">Unable to load tenants</p><p className="mt-1 text-sm text-muted-foreground">{parseApiError(tenantsQuery.error).message}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => tenantsQuery.refetch()}>Try again</Button></div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-brand" /><p className="mt-3 font-semibold">No tenants found</p><p className="mt-1 text-sm text-muted-foreground">Adjust the filters or create the first tenant.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Tenant</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 font-medium">Updated</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y">{filteredTenants.map((tenant) => <tr key={tenant.id} className="hover:bg-muted/25"><td className="px-4 py-3"><p className="font-medium">{tenant.name}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{tenant.slug}</p></td><td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{tenant.plan || "No plan"}</Badge></td><td className="px-4 py-3"><StatusBadge active={tenant.is_active} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(tenant.created_at)}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(tenant.updated_at)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><ActionButton label="View tenant" onClick={() => { setSelectedTenant(tenant); setDetailOpen(true); }}><Eye className="h-4 w-4" /></ActionButton><ActionButton label="Edit tenant" onClick={() => openEdit(tenant)}><Pencil className="h-4 w-4" /></ActionButton><ActionButton label="Delete tenant" destructive onClick={() => { setDeleteTarget(tenant); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></ActionButton></div></td></tr>)}</tbody></table></div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground"><span>{tenantsQuery.data?.from ?? 0}-{tenantsQuery.data?.to ?? 0} of {total} tenants</span><div className="flex gap-1"><Button variant="outline" size="sm" className="h-8" disabled={page <= 1 || tenantsQuery.isFetching} onClick={() => updateSearch({ page: page - 1 })}><ChevronLeft className="h-4 w-4" />Previous</Button><Button variant="outline" size="sm" className="h-8" disabled={page >= lastPage || tenantsQuery.isFetching} onClick={() => updateSearch({ page: page + 1 })}>Next<ChevronRight className="h-4 w-4" /></Button></div></div>
      </Card>

      <TenantFormDialog open={formOpen} onOpenChange={setFormOpen} form={form} editingTenant={editingTenant} fieldErrors={fieldErrors} isSaving={isSaving} slugManuallyEdited={slugManuallyEdited} setName={setName} setForm={setForm} setSlugManuallyEdited={setSlugManuallyEdited} onSubmit={submitForm} />

      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedTenant(null); }}><DialogContent><DialogHeader><DialogTitle>Tenant details</DialogTitle><DialogDescription>Global workspace record from the System Admin API.</DialogDescription></DialogHeader>{detailQuery.isLoading ? <div className="space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-20 w-full" /></div> : detailQuery.isError ? <p className="text-sm text-destructive">{parseApiError(detailQuery.error).message}</p> : detailQuery.data ? <TenantDetails tenant={detailQuery.data} /> : null}<DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>{detailQuery.data && <Button onClick={() => { setDetailOpen(false); openEdit(detailQuery.data!); }}><Pencil className="mr-1.5 h-4 w-4" />Edit tenant</Button>}</DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle><AlertDialogDescription>You are about to permanently delete this tenant. This can affect the customer&apos;s entire workspace and cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}>{deleteMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Delete tenant</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </AppLayout>
  );
}

function TenantFormDialog({ open, onOpenChange, form, editingTenant, fieldErrors, isSaving, slugManuallyEdited, setName, setForm, setSlugManuallyEdited, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; form: FormState; editingTenant: TenantResource | null; fieldErrors: Record<string, string>; isSaving: boolean; slugManuallyEdited: boolean; setName: (name: string) => void; setForm: React.Dispatch<React.SetStateAction<FormState>>; setSlugManuallyEdited: (value: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const isEdit = Boolean(editingTenant);
  const slugChanged = isEdit && form.slug !== editingTenant?.slug;
  const willDeactivate = isEdit && editingTenant?.is_active && !form.is_active;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isEdit ? "Edit tenant" : "Create tenant"}</DialogTitle><DialogDescription>{isEdit ? "Changing the slug can affect the tenant subdomain and access entrypoint." : "Create a global tenant workspace and choose its initial service plan."}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={onSubmit}><FormField label="Tenant name" error={fieldErrors.name}><Input value={form.name} onChange={(event) => setName(event.target.value)} placeholder="Acme Education" autoFocus /></FormField><FormField label="Slug" error={fieldErrors.slug}><Input value={form.slug} onChange={(event) => { setSlugManuallyEdited(true); setForm((current) => ({ ...current, slug: event.target.value })); }} placeholder="acme-education" /><p className="mt-1 text-xs text-muted-foreground">Lowercase URL identifier. Suggested from the name until you edit it manually.</p></FormField>{slugChanged && <p className="rounded-md border border-brand/35 bg-brand/10 px-3 py-2 text-xs text-foreground">Slug change detected. Confirm the tenant&apos;s subdomain routing before saving.</p>}<FormField label="Plan" error={fieldErrors.plan}><Select value={form.plan || "none"} onValueChange={(value) => setForm((current) => ({ ...current, plan: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent><SelectItem value="none">No plan assigned</SelectItem>{PLAN_OPTIONS.map((plan) => <SelectItem key={plan} value={plan} className="capitalize">{plan}</SelectItem>)}</SelectContent></Select></FormField><div className="flex items-center justify-between rounded-lg border p-3"><div><Label htmlFor="tenant-active" className="font-medium">Active workspace</Label><p className="mt-0.5 text-xs text-muted-foreground">Inactive tenants should not be able to access the platform.</p></div><Switch id="tenant-active" checked={form.is_active} onCheckedChange={(is_active) => setForm((current) => ({ ...current, is_active }))} /></div>{willDeactivate && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">This will suspend access for the tenant&apos;s workspace.</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button><Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={isSaving}>{isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{isEdit ? "Save changes" : "Create tenant"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>; }
function StatusBadge({ active }: { active: boolean }) { return <Badge variant="outline" className={active ? "border-success/35 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground"}>{active ? "Active" : "Inactive"}</Badge>; }
function ActionButton({ label, destructive, onClick, children }: { label: string; destructive?: boolean; onClick: () => void; children: React.ReactNode }) { return <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive")} onClick={onClick}><span className="sr-only">{label}</span>{children}</Button>; }
function TenantDetails({ tenant }: { tenant: TenantResource }) { return <div className="grid grid-cols-2 gap-3 text-sm"><DetailItem label="Tenant name" value={tenant.name} /><DetailItem label="Status" value={<StatusBadge active={tenant.is_active} />} /><DetailItem label="Slug" value={<code className="text-xs">{tenant.slug}</code>} /><DetailItem label="Plan" value={<span className="capitalize">{tenant.plan || "No plan"}</span>} /><DetailItem label="Created" value={formatDateTime(tenant.created_at)} /><DetailItem label="Last updated" value={formatDateTime(tenant.updated_at)} /></div>; }
function DetailItem({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-md border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 font-medium">{value}</div></div>; }
function TenantTableSkeleton() { return <div className="space-y-3 p-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-6 gap-3"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div>)}</div>; }
function slugify(value: string) { return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "-"; }
function formatDateTime(value: string | null) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"; }
