import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Search, ChevronDown, Building2, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/axios";
import {
  clearAccessToken,
  getInitials,
  hasPermission,
} from "@/lib/auth";
import { useAuthContextQuery } from "@/lib/auth-context";

export function AppHeader({ breadcrumbs = [] as { label: string; to?: string }[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const meQuery = useAuthContextQuery();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.post("/v1/auth/logout");
      } finally {
        clearAccessToken();
        queryClient.removeQueries({ queryKey: ["auth", "me"] });
        navigate({ to: "/login", replace: true });
      }
    },
  });

  const context = meQuery.data;
  const profile = context?.user;
  const tenantName = context?.tenant?.name ?? "Current tenant";
  const showCreate = hasPermission(context, ["questions:create", "tests:create", "assignments:create"]);

  const profileName = profile?.display_name ?? (meQuery.isLoading ? "Loading user..." : "Unknown user");
  const profileEmail = profile?.email ?? (meQuery.isLoading ? "Fetching profile..." : "No email available");
  const profileInitials = getInitials(profile?.display_name, profile?.email);

  return (
    <header className="h-16 shrink-0 border-b bg-card flex items-center gap-4 px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 font-medium">
            <Building2 className="h-4 w-4 text-brand" />
            <span className="hidden sm:inline">{tenantName}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Tenant context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Building2 className="mr-2 h-4 w-4" />
            {tenantName}
          </DropdownMenuItem>
          {context?.tenant?.id && (
            <DropdownMenuItem disabled className="font-mono text-xs text-muted-foreground">
              {context.tenant.id}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="hidden md:flex items-center text-sm text-muted-foreground">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className="mx-2 text-border">/</span>}
            {b.to ? (
              <Link to={b.to} className="hover:text-foreground">{b.label}</Link>
            ) : (
              <span className="text-foreground font-medium">{b.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search questions, tests, users…" className="pl-8 w-72 h-9 bg-muted/40" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </div>

        {showCreate && (
          <Button size="sm" className="h-9 bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
          </Button>
        )}

        <Button variant="ghost" size="icon" className="h-9 w-9"><HelpCircle className="h-4.5 w-4.5" /></Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-card" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-ink text-brand font-semibold text-xs">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-[13px] font-medium">{profileName}</div>
                <div className="text-[11px] text-muted-foreground">{profileEmail}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{profileName}</div>
              <div className="text-xs text-muted-foreground font-normal">{profileEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profile?.tenant_id && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Tenant ID: {profile.tenant_id.slice(0, 8)}
              </DropdownMenuItem>
            )}
            {context?.roles.length ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Role: {context.roles.map((role) => role.name).join(", ")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                logoutMutation.mutate();
              }}
            >
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge variant="outline" className="font-medium">{role}</Badge>;
}
