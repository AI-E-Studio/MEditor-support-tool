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

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }

  const events = await listLoginEvents(1000);
  const users = aggregateRegisteredUsers(events);
  const auditEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <>
      <PageHeader
        title="登録ユーザー"
        description="Google で 1 回以上ログインしたメールを 1 ユーザーとして集計しています"
      />

      {!auditEnabled && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="px-5 py-4 flex items-start gap-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="text-sm text-amber-900 leading-relaxed">
              <strong className="font-semibold">BLOB_READ_WRITE_TOKEN</strong>{" "}
              が未設定のため、データは表示されません。
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title="ユーザー一覧"
          description="ログイン回数の多い順"
          action={
            <Badge tone="accent">{users.length.toLocaleString()} 名</Badge>
          }
        />
        <Table>
          <THead>
            <TR hover={false}>
              <TH>メール</TH>
              <TH>表示名（最終ログイン時）</TH>
              <TH align="right">ログイン回数</TH>
              <TH>初回（UTC）</TH>
              <TH>最終（UTC）</TH>
            </TR>
          </THead>
          <TBody>
            {users.length === 0 ? (
              <EmptyState colSpan={5}>
                {auditEnabled
                  ? "まだ利用者の記録がありません。"
                  : "履歴を保存するには Blob トークンを設定してください。"}
              </EmptyState>
            ) : (
              users.map((row) => (
                <TR key={row.email}>
                  <TD className="break-all font-medium">{row.email}</TD>
                  <TD className="text-slate-500">{row.name ?? "—"}</TD>
                  <TD align="right" className="tabular-nums font-semibold">
                    {row.loginCount.toLocaleString()}
                  </TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-slate-600">
                    {row.firstLoggedInAt}
                  </TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-slate-600">
                    {row.lastLoggedInAt}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
