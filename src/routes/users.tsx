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
import { Plus, Search, MoreHorizontal, Mail, ShieldCheck, Key } from "lucide-react";
import { getTenantId, getInitials } from "@/lib/auth";
import {
  listAllPermissions,
  listAllRoles,
  listAllUsers,
  type PermissionResource,
  type RoleResource,
  type UserResource,
} from "@/lib/user-management";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User management · ExamForge" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [userSearch, setUserSearch] = useState("");
  const tenantId = getTenantId() ?? undefined;

  const usersQuery = useQuery({
    queryKey: ["admin", "users", tenantId],
    queryFn: () => listAllUsers({ tenant_id: tenantId }),
    staleTime: 30_000,
  });

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles", tenantId],
    queryFn: () => listAllRoles({ tenant_id: tenantId }),
    staleTime: 30_000,
  });

  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => listAllPermissions(),
    staleTime: 30_000,
  });

  const allUsers = usersQuery.data ?? [];
  const users = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    if (!search) return allUsers;

    return allUsers.filter((user) => {
      const roleNames = user.roles.map((role) => role.name).join(" ").toLowerCase();
      return [user.display_name, user.email, roleNames].some((value) => value.toLowerCase().includes(search));
    });
  }, [allUsers, userSearch]);

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  const rolePermissionKeys = (role: RoleResource) =>
    role.permissions.map((permission) => `${permission.resource}.${permission.action}`);

  const permissionKey = (permission: PermissionResource) => `${permission.resource}.${permission.action}`;

  const loading = usersQuery.isLoading || rolesQuery.isLoading || permissionsQuery.isLoading;
  const error = usersQuery.error || rolesQuery.error || permissionsQuery.error;

  return (
    <AppLayout
      breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
      title="User management"
      description="Invite users, assign roles, and manage permissions across the current tenant."
      actions={
        <>
          <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1.5"/> Bulk invite</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> Add user</Button>
        </>
      }
    >
      <Tabs defaultValue="users">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users">Users <Badge variant="secondary" className="ml-2">{allUsers.length}</Badge></TabsTrigger>
          <TabsTrigger value="roles">Roles <Badge variant="secondary" className="ml-2">{roles.length}</Badge></TabsTrigger>
          <TabsTrigger value="permissions">Permissions <Badge variant="secondary" className="ml-2">{permissions.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="overflow-hidden">
            <div className="p-3 border-b flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search users…"
                  className="pl-8 h-9"
                />
              </div>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading users from BE...</div>
            ) : error ? (
              <div className="p-6 text-sm text-destructive">Không tải được dữ liệu users/roles/permissions từ BE.</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Không có user nào phù hợp với bộ lọc hiện tại.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2.5"><Checkbox/></th>
                    <th className="text-left px-4 py-2.5 font-medium">User</th>
                    <th className="text-left px-4 py-2.5 font-medium">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Created at</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user: UserResource) => {
                    const primaryRole = user.roles[0];
                    const extraRoles = Math.max(0, user.roles.length - 1);

                    return (
                      <tr key={user.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3"><Checkbox/></td>
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
                                  className={primaryRole.name === "Tenant Admin" ? "bg-brand/15 border-brand/40" : ""}
                                >
                                  {primaryRole.name}
                                </Badge>
                                {extraRoles > 0 && <Badge variant="secondary">+{extraRoles}</Badge>}
                              </>
                            ) : (
                              <span className="text-muted-foreground">No role</span>
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
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
                        </td>
                        <td><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5"/></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roles.map((role: RoleResource) => (
              <Card key={role.id} className="p-5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-brand/15 grid place-items-center"><ShieldCheck className="h-4 w-4 text-foreground"/></div>
                  <div>
                    <div className="font-semibold">{role.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {allUsers.filter((user) => user.roles.some((item) => item.id === role.id)).length} users
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {role.permissions.length} permissions granted
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.slice(0, 4).map((permission) => (
                    <Badge key={permission.id} variant="secondary" className="font-mono text-[10px] font-normal">
                      {permission.resource}.{permission.action}
                    </Badge>
                  ))}
                  {role.permissions.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 4}</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">Edit role</Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4 text-brand"/> Permission matrix</h3>
              <p className="text-xs text-muted-foreground mt-1">Toggle to grant a permission to a role across the tenant.</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Permission</th>
                  {roles.map((role) => <th key={role.id} className="text-center px-4 py-2.5 font-medium">{role.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{permission.resource}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{permissionKey(permission)}</div>
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="text-center px-4 py-3">
                        <Checkbox defaultChecked={rolePermissionKeys(role).includes(permissionKey(permission))}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
