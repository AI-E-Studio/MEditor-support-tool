import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  aggregateRegisteredUsers,
  listLoginEvents,
} from "@/lib/loginAudit";
import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";

function withinHours(iso: string, hours: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 3600 * 1000;
}

export default async function AdminLoginHistoryPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }

  const events = await listLoginEvents(200);
  const users = aggregateRegisteredUsers(events);
  const auditEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  const last24h = events.filter((e) => withinHours(e.loggedInAt, 24)).length;
  const last7dUsers = new Set(
    events
      .filter((e) => withinHours(e.loggedInAt, 24 * 7))
      .map((e) => e.email)
  ).size;

  return (
    <>
      <PageHeader
        title="ログイン履歴"
        description={`Google ログインが完了したタイミングを記録しています（直近 ${events.length} 件）`}
      />

      {!auditEnabled && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="px-5 py-4 flex items-start gap-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="text-sm text-amber-900 leading-relaxed">
              <strong className="font-semibold">BLOB_READ_WRITE_TOKEN</strong>{" "}
              が未設定のため、ログイン履歴はサーバーに保存されていません。Vercel
              Blob を接続し、環境変数を設定して再デプロイしてください。
            </div>
          </div>
        </Card>
      )}

      {/* 概要 KPI カード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="累計ログイン件数"
          value={events.length.toLocaleString()}
          hint="直近200件まで保持"
          tone="primary"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-5" />
            </svg>
          }
        />
        <StatCard
          label="ユニークユーザー"
          value={users.length.toLocaleString()}
          hint="メール単位の重複排除"
          tone="accent"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="7" r="4" />
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            </svg>
          }
        />
        <StatCard
          label="直近24h ログイン"
          value={last24h.toLocaleString()}
          hint="過去24時間以内"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
        <StatCard
          label="アクティブ（直近7日）"
          value={last7dUsers.toLocaleString()}
          hint="ユニークなメール数"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          }
        />
      </div>

      {/* ログイン履歴テーブル */}
      <Card className="overflow-hidden">
        <CardHeader
          title="最新のログインイベント"
          description="新しい順に並んでいます"
          action={
            <Badge tone="accent">{events.length.toLocaleString()} 件</Badge>
          }
        />
        <Table>
          <THead>
            <TR hover={false}>
              <TH className="w-1/4">日時（UTC）</TH>
              <TH>メール</TH>
              <TH>表示名</TH>
            </TR>
          </THead>
          <TBody>
            {events.length === 0 ? (
              <EmptyState colSpan={3}>
                {auditEnabled
                  ? "まだ記録がありません。"
                  : "履歴を保存するには Blob トークンを設定してください。"}
              </EmptyState>
            ) : (
              events.map((row, i) => (
                <TR key={`${row.loggedInAt}-${row.email}-${i}`}>
                  <TD className="whitespace-nowrap font-mono text-xs text-slate-600">
                    {row.loggedInAt}
                  </TD>
                  <TD className="break-all">{row.email}</TD>
                  <TD className="text-slate-500">{row.name ?? "—"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
