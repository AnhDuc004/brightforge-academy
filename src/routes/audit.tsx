import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Download, FileSearch, Filter } from "lucide-react";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit logs · ExamForge" }] }),
  component: AuditPage,
});

const actionTone: Record<string, string> = {
  PUBLISH: "bg-success/15 text-success border-success/30",
  CREATE: "bg-info/15 text-info border-info/30",
  UPDATE: "bg-brand/15 border-brand/40",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
  AUTO_GRADE: "bg-muted text-muted-foreground",
  REVIEW: "bg-accent border-border",
  INVITE: "bg-info/15 text-info border-info/30",
  SUBMIT: "bg-accent border-border",
};

function AuditPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
      title="Audit logs"
      description="Immutable, tenant-wide event stream. Retained for 7 years per enterprise compliance policy."
      actions={<Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5"/> Export CSV</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search by actor, resource ID, or action…" className="pl-8 h-9"/>
          </div>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="p">PUBLISH</SelectItem>
              <SelectItem value="c">CREATE</SelectItem>
              <SelectItem value="u">UPDATE</SelectItem>
              <SelectItem value="r">REVIEW</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="7"><SelectTrigger className="w-[140px] h-9"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9"><Filter className="h-4 w-4 mr-1.5"/>More filters</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5"/> Table view
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Actor</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
                <th className="text-left px-4 py-2.5 font-medium">Resource</th>
                <th className="text-left px-4 py-2.5 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{l.actor}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={"font-mono text-[10px] " + (actionTone[l.action] ?? "")}>{l.action}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{l.resource}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Timeline</h3>
          <p className="text-xs text-muted-foreground mb-4">Live stream</p>
          <ol className="relative border-l border-border ml-2 space-y-5">
            {auditLogs.map((l) => (
              <li key={l.id} className="ml-4">
                <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand ring-4 ring-card"/>
                <div className="text-sm">
                  <span className="font-medium">{l.actor}</span>{" "}
                  <Badge variant="secondary" className="font-mono text-[10px] mx-1">{l.action}</Badge>{" "}
                  <span className="text-muted-foreground">on</span>{" "}
                  <span className="font-mono text-xs">{l.resource}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{l.time}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </AppLayout>
  );
}
