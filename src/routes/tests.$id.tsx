import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileText, Target, Calendar, Lock, Send, Pencil, Loader2, Trash2 } from "lucide-react";
import { deleteTest, getTest, publishTest, type TestResource } from "@/lib/tests";
import { parseApiError } from "@/lib/auth";

export const Route = createFileRoute("/tests/$id")({
  head: () => ({ meta: [{ title: "Chi tiết bài kiểm tra · ExamForge" }] }),
  component: TestDetails,
});

function totalQuestions(test: TestResource) {
  return test.sections.reduce((sum, section) => sum + section.questions.length, 0);
}

function TestDetails() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const testQuery = useQuery({
    queryKey: ["tests", "detail", id],
    queryFn: () => getTest(id),
    staleTime: 30_000,
  });

  const publishMutation = useMutation({
    mutationFn: publishTest,
    onSuccess: async () => {
      toast.success("Đã xuất bản bài kiểm tra thành công.");
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTest,
    onSuccess: async () => {
      toast.success("Đã xóa bài kiểm tra thành công.");
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const test = testQuery.data;
  const isPublished = test?.status === "published";

  return (
    <AppLayout
      breadcrumbs={[{ label: "Bài kiểm tra", to: "/tests" }, { label: test?.id ?? id }]}
      title={test?.title ?? "Đang tải bài kiểm tra..."}
      description={
        isPublished
          ? "Bài kiểm tra đã xuất bản · ảnh chụp đã được cố định. Chỉnh sửa câu hỏi nguồn sẽ không ảnh hưởng đến bài kiểm tra này."
          : "Bài kiểm tra bản nháp · vẫn có thể chỉnh sửa. Hãy thêm phần/câu hỏi trước khi xuất bản."
      }
      actions={
        <>
          {test && (
            <Link to="/tests/builder" search={{ testId: test.id }}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1.5" /> Chỉnh sửa
              </Button>
            </Link>
          )}
          {test && !isPublished && (
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={publishMutation.isPending}
              onClick={() => {
                void publishMutation.mutateAsync(test.id);
              }}
            >
              <Send className="h-4 w-4 mr-1.5" /> Xuất bản
            </Button>
          )}
          {test && !isPublished && (
            <Button
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                void deleteMutation.mutateAsync(test.id);
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa bản nháp
            </Button>
          )}
        </>
      }
    >
      {testQuery.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground">Đang tải chi tiết bài kiểm tra từ BE...</Card>
      ) : testQuery.error || !test ? (
        <Card className="p-8 text-sm text-destructive">Không tải được chi tiết bài kiểm tra từ BE.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI icon={Clock} label="Thời lượng" value={`${Math.max(1, Math.round(test.duration_seconds / 60))} phút`} />
            <KPI icon={Target} label="Điểm đạt" value={`${test.passing_score}%`} />
            <KPI icon={FileText} label="Câu hỏi" value={String(totalQuestions(test))} />
            <KPI icon={Users} label="Các phần" value={String(test.sections.length)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-semibold mb-1">Các phần</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {test.sections.length} phần · {totalQuestions(test)} câu hỏi · ảnh chụp được giữ trong từng phần
              </p>
              <div className="space-y-3">
                {test.sections.map((section) => (
                  <div key={section.id} className="border rounded-lg p-4 hover:border-brand/40 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {section.position}. {section.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {section.questions.length} câu hỏi
                          {section.instructions ? ` · ${section.instructions}` : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        <Lock className="h-3 w-3 mr-1" />
                        Ảnh chụp
                      </Badge>
                    </div>

                    {section.questions.length > 0 && (
                      <ol className="mt-4 divide-y rounded-md border bg-muted/20">
                        {section.questions.map((question) => (
                          <li key={question.id} className="flex items-start gap-3 px-4 py-3">
                            <span className="text-xs font-mono text-muted-foreground w-6">
                              {question.position}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium line-clamp-2">
                                {question.question_snapshot.content}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
                                <span className="font-mono">{question.question_id}</span>
                                <span>·</span>
                                <span>{question.question_snapshot.type}</span>
                                <span>·</span>
                                <span>{question.score_override ?? question.question_snapshot.max_score} điểm</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Xuất bản</h3>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Trạng thái" value={<StatusBadge status={test.status} />} />
                  <Row label="Được xuất bản bởi" value={test.creator?.display_name ?? "—"} />
                  <Row label="Ngày xuất bản" value={formatDate(test.published_at)} />
                  <Row label="Phiên bản" value={<span className="font-mono text-xs">{test.updated_at ?? "—"}</span>} />
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3">Siêu dữ liệu</h3>
                <dl className="space-y-2.5 text-sm">
                  <Row label="ID bài kiểm tra" value={<span className="font-mono text-xs">{test.id}</span>} />
                  <Row label="ID tenant" value={<span className="font-mono text-xs">{test.tenant_id ?? "—"}</span>} />
                  <Row label="Người tạo" value={test.creator?.display_name ?? test.created_by ?? "—"} />
                  <Row label="Ngày tạo" value={formatDate(test.created_at)} />
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3">Quy tắc chỉ đọc</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {isPublished ? "Bài kiểm tra này đã xuất bản và bị khóa." : "Bài kiểm tra này vẫn có thể chỉnh sửa."}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <Badge className="bg-success/20 text-success border-success/30" variant="outline">
        Đã xuất bản
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground">
      Bản nháp
    </Badge>
  );
}

function KPI({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight mt-1.5">{value}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
