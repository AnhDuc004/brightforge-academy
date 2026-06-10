import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout({
  children,
  breadcrumbs,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto">
          {(title || actions) && (
            <div className="border-b bg-card/40 px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
              <div>
                {title && <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>}
                {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
