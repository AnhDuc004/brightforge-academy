import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { getAccessToken } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ExamForge" },
      { name: "description", content: "ExamForge enterprise assessment platform" },
      { name: "author", content: "ExamForge" },
      { property: "og:title", content: "ExamForge" },
      { property: "og:description", content: "ExamForge enterprise assessment platform" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@ExamForge" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authState, setAuthState] = useState<"loading" | "guest" | "authed">("loading");

  useEffect(() => {
    setAuthState(getAccessToken() ? "authed" : "guest");
  }, []);

  useEffect(() => {
    const syncAuth = () => setAuthState(getAccessToken() ? "authed" : "guest");
    window.addEventListener("auth-change", syncAuth);
    return () => window.removeEventListener("auth-change", syncAuth);
  }, []);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const shouldRedirectToLogin = authState === "guest" && !isAuthRoute;
  const shouldRedirectToDashboard = authState === "authed" && isAuthRoute;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.navigate({ to: "/login", replace: true });
      return;
    }

    if (shouldRedirectToDashboard) {
      router.navigate({ to: "/", replace: true });
    }
  }, [pathname, router, shouldRedirectToDashboard, shouldRedirectToLogin]);

  if (authState === "loading" || shouldRedirectToLogin || shouldRedirectToDashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,179,1,0.14),_transparent_30%),linear-gradient(180deg,_#0b0b0b_0%,_#111111_100%)] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-lg backdrop-blur">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
          Loading ExamForge...
        </div>
      </div>
    );
  }

  return <Outlet />;
}
