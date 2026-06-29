import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Loader2, Plus, Search, MoreHorizontal, Mail, ShieldCheck, Key } from "lucide-react";
import { toast } from "sonner";
import { getInitials, hasPermission, parseApiError } from "@/lib/auth";
import { useAuthContextQuery } from "@/lib/auth-context";
import {
  listAllPermissions,
  listAllRoles,
  listAllUsers,
  type PermissionResource,
  type RoleResource,
  type UserResource,
} from "@/lib/user-management";
import { createStudentInvitation } from "@/lib/student-invitations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Quản lý người dùng · ExamForge" }] }),
  component: UsersPage,
});

function UsersPage() {
  const authQuery = useAuthContextQuery();
  const [userSearch, setUserSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDays, setInviteDays] = useState("7");
  const [inviteUrl, setInviteUrl] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const canViewUsers = hasPermission(authQuery.data, "users:view");
  const canCreateUsers = hasPermission(authQuery.data, "users:create");
  const canViewRoles = hasPermission(authQuery.data, "roles:view");
  const canManagePermissions = hasPermission(authQuery.data, "tenant:settings");

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listAllUsers(),
    enabled: canViewUsers || canViewRoles,
    staleTime: 30_000,
  });

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => listAllRoles(),
    enabled: canViewRoles || canManagePermissions,
    staleTime: 30_000,
  });

  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => listAllPermissions(),
    enabled: canManagePermissions,
    staleTime: 30_000,
  });

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const users = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    if (!search) return allUsers;

    return allUsers.filter((user) => {
      const roleNames = user.roles
        .map((role) => role.name)
        .join(" ")
        .toLowerCase();
      return [user.display_name, user.email, roleNames].some((value) =>
        value.toLowerCase().includes(search),
      );
    });
  }, [allUsers, userSearch]);

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  const permissionKey = (permission: PermissionResource) =>
    `${permission.resource}:${permission.action}`;

  const rolePermissionMap = useMemo(
    () =>
      new Map(
        roles.map((role) => [
          role.id,
          new Set(role.permissions.map((permission) => `${permission.resource}:${permission.action}`)),
        ]),
      ),
    [roles],
  );

  function isGlobalRole(role: RoleResource) {
    return role.tenant_id == null;
  }

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingInvite(true);
    try {
      const invitation = await createStudentInvitation({
        email: inviteEmail.trim() || undefined,
        expires_in_days: Number(inviteDays) || 7,
      });
      setInviteUrl(invitation.invite_url);
      toast.success("Student invitation created.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsCreatingInvite(false);
    }
  }

  const loading =
    ((canViewUsers || canViewRoles) && usersQuery.isLoading) ||
    ((canViewRoles || canManagePermissions) && rolesQuery.isLoading) ||
    (canManagePermissions && permissionsQuery.isLoading);
  const error =
    ((canViewUsers || canViewRoles) ? usersQuery.error : null) ||
    ((canViewRoles || canManagePermissions) ? rolesQuery.error : null) ||
    (canManagePermissions ? permissionsQuery.error : null);

  return (
    <AppLayout
      breadcrumbs={[{ label: "Quản trị" }, { label: "Người dùng" }]}
      title="Quản lý người dùng"
      description="Mời người dùng, gán vai trò và quản lý quyền trong tenant hiện tại."
      actions={
        <>
          {canCreateUsers && (
            <>
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <Mail className="h-4 w-4 mr-1.5" /> Mời student
              </Button>
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-1.5" /> Add user
              </Button>
            </>
          )}
        </>
      }
    >
      <Tabs defaultValue={canViewUsers ? "users" : canViewRoles ? "roles" : "permissions"}>
        <TabsList className="bg-muted/50">
          {canViewUsers && (
            <TabsTrigger value="users">
              Users{" "}
              <Badge variant="secondary" className="ml-2">
                {allUsers.length}
              </Badge>
            </TabsTrigger>
          )}
          {canViewRoles && (
            <TabsTrigger value="roles">
              Roles{" "}
              <Badge variant="secondary" className="ml-2">
                {roles.length}
              </Badge>
            </TabsTrigger>
          )}
          {canManagePermissions && (
            <TabsTrigger value="permissions">
              Permissions{" "}
              <Badge variant="secondary" className="ml-2">
                {permissions.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {canViewUsers && <TabsContent value="users" className="mt-4">
          <Card className="overflow-hidden">
            <div className="p-3 border-b flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Tìm người dùng…"
                  className="pl-8 h-9"
                />
              </div>
            </div>
          {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Đang tải người dùng từ BE...</div>
            ) : error ? (
              <div className="p-6 text-sm text-destructive">
                Không tải được dữ liệu users/roles/permissions từ BE.
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Không có user nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <Checkbox />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium">Người dùng</th>
                    <th className="text-left px-4 py-2.5 font-medium">Vai trò</th>
                    <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                    <th className="text-left px-4 py-2.5 font-medium">Ngày tạo</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user: UserResource) => {
                    const primaryRole = user.roles[0];
                    const extraRoles = Math.max(0, user.roles.length - 1);

                    return (
                      <tr key={user.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Checkbox />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[11px] bg-muted">
                                {getInitials(user.display_name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.display_name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {primaryRole ? (
                              <>
                                <Badge
                                  variant="outline"
                                  className={
                                    primaryRole.name === "Tenant Admin"
                                      ? "bg-brand/15 border-brand/40"
                                      : ""
                                  }
                                >
                                  {primaryRole.name}
                                </Badge>
                                {extraRoles > 0 && <Badge variant="secondary">+{extraRoles}</Badge>}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Chưa có vai trò</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                          className={
                            user.is_active
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                          }
                        >
                            {user.is_active ? "Hoạt động" : "Không hoạt động"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
                        </td>
                        <td>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>}

        {canViewRoles && <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roles.map((role: RoleResource) => (
              <Card key={role.id} className="p-5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-brand/15 grid place-items-center">
                    <ShieldCheck className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{role.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {
                        allUsers.filter((user) => user.roles.some((item) => item.id === role.id))
                          .length
                      }{" "}
                      người dùng
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className={isGlobalRole(role) ? "bg-muted/40" : ""}>
                    {isGlobalRole(role) ? "Toàn cục" : "Tenant hiện tại"}
                  </Badge>
                  {isGlobalRole(role) && (
                    <span className="text-xs text-muted-foreground">
                      Vai trò danh mục chỉ đọc để gán.
                    </span>
                  )}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Đã cấp {role.permissions.length} quyền
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.slice(0, 4).map((permission) => (
                    <Badge
                      key={permission.id}
                      variant="secondary"
                      className="font-mono text-[10px] font-normal"
                    >
                      {permission.resource}:{permission.action}
                    </Badge>
                  ))}
                  {role.permissions.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{role.permissions.length - 4}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  disabled={isGlobalRole(role)}
                  title={isGlobalRole(role) ? "Vai trò toàn cục chỉ đọc." : "Chỉnh sửa vai trò"}
                >
                  {isGlobalRole(role) ? "Chỉ đọc" : "Chỉnh sửa"}
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>}

        {canManagePermissions && <TabsContent value="permissions" className="mt-4">
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/20 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Key className="h-4 w-4 text-brand" /> Permission matrix
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Read-only catalog of global permissions. Only System Admin can change the
                    catalog.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Granted
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
                    Not granted
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr className="border-b">
                    <th className="sticky left-0 z-20 min-w-[240px] bg-muted/30 px-5 py-3 text-left font-medium">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="min-w-[150px] px-3 py-3 font-medium">
                        <div className="flex flex-col items-center gap-1 text-center normal-case tracking-normal">
                          <span className="text-sm font-semibold text-foreground">{role.name}</span>
                          <Badge
                            variant="outline"
                            className={isGlobalRole(role) ? "bg-background/80" : "bg-brand/10"}
                          >
                            {isGlobalRole(role) ? "Global" : "Tenant"}
                          </Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {permissions.map((permission) => {
                    const permissionId = permissionKey(permission);

                    return (
                      <tr key={permission.id} className="bg-background transition-colors hover:bg-muted/20">
                        <td className="sticky left-0 z-10 bg-background px-5 py-4 align-middle">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{permission.resource}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {permissionId}
                            </div>
                          </div>
                        </td>
                        {roles.map((role) => {
                          const isGranted = rolePermissionMap.get(role.id)?.has(permissionId) ?? false;

                          return (
                            <td key={role.id} className="px-3 py-4 align-middle">
                              <div className="flex items-center justify-center">
                                <div
                                  className={
                                    isGranted
                                      ? "flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10"
                                      : "flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-muted/25"
                                  }
                                >
                                  <Checkbox
                                    checked={isGranted}
                                    disabled
                                    className="m-0"
                                    aria-label={`${permission.resource}:${permission.action} for ${role.name}`}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>}
      </Tabs>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail("");
            setInviteDays("7");
            setInviteUrl("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lời mời cho học viên</DialogTitle>
            <DialogDescription>
              Tạo liên kết để học viên đăng ký bằng mã lời mời.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCreateInvite}>
            <div className="grid gap-2">
              <Label htmlFor="invite_email">Email nhận lời mời</Label>
              <Input
                id="invite_email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="optional@student.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite_days">Hết hạn sau số ngày</Label>
              <Input
                id="invite_days"
                type="number"
                min="1"
                value={inviteDays}
                onChange={(event) => setInviteDays(event.target.value)}
              />
            </div>

            {inviteUrl && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  URL lời mời
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 rounded bg-background px-2 py-1 text-xs">
                    {inviteUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteUrl);
                      toast.success("Đã sao chép liên kết lời mời.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Đóng
              </Button>
              <Button
                type="submit"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={isCreatingInvite}
              >
                {isCreatingInvite && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo lời mời
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
