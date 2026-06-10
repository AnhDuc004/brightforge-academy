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
import { users, roles, permissions, roleMatrix } from "@/lib/mock-data";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User management · ExamForge" }] }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
      title="User management"
      description="Invite users, assign roles, and manage permissions across ABC University."
      actions={
        <>
          <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1.5"/> Bulk invite</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> Add user</Button>
        </>
      }
    >
      <Tabs defaultValue="users">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users">Users <Badge variant="secondary" className="ml-2">{users.length}</Badge></TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="overflow-hidden">
            <div className="p-3 border-b flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search users…" className="pl-8 h-9"/>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2.5"><Checkbox/></th>
                  <th className="text-left px-4 py-2.5 font-medium">User</th>
                  <th className="text-left px-4 py-2.5 font-medium">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last active</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><Checkbox/></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px] bg-muted">{u.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className={u.role === "Tenant Admin" ? "bg-brand/15 border-brand/40" : ""}>{u.role}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={u.status === "Active" ? "bg-success/15 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.lastActive}</td>
                    <td><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5"/></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roles.map((r) => (
              <Card key={r} className="p-5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-brand/15 grid place-items-center"><ShieldCheck className="h-4 w-4 text-foreground"/></div>
                  <div>
                    <div className="font-semibold">{r}</div>
                    <div className="text-xs text-muted-foreground">{users.filter(u => u.role === r).length} users</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {roleMatrix[r].length} permissions granted
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {roleMatrix[r].slice(0, 4).map((p) => <Badge key={p} variant="secondary" className="font-mono text-[10px] font-normal">{p}</Badge>)}
                  {roleMatrix[r].length > 4 && <Badge variant="outline" className="text-[10px]">+{roleMatrix[r].length - 4}</Badge>}
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
                  {roles.map((r) => <th key={r} className="text-center px-4 py-2.5 font-medium">{r}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {permissions.map((p) => (
                  <tr key={p.key} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{p.key}</div>
                    </td>
                    {roles.map((r) => (
                      <td key={r} className="text-center px-4 py-3">
                        <Checkbox defaultChecked={roleMatrix[r].includes(p.key)}/>
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
