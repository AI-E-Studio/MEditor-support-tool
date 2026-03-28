import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { listLoginEvents } from "@/lib/loginAudit";
import { UserMenu } from "@/components/UserMenu";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }

  const events = await listLoginEvents(200);
  const auditEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-(--muted) uppercase tracking-wide">
              管理者
            </p>
            <h1 className="text-xl font-bold text-(--foreground)">
              ログイン履歴
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-(--primary) hover:underline"
            >
              トップへ
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!auditEnabled && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">BLOB_READ_WRITE_TOKEN</strong>
            が未設定のため、ログイン履歴はサーバーに保存されていません。Vercel
            Blob を接続し、環境変数を設定して再デプロイしてください。
          </div>
        )}

        <p className="text-sm text-(--muted) mb-4">
          Google ログインが完了したタイミングの記録です（直近{" "}
          {events.length} 件を表示）。
        </p>

        <div className="bg-white border border-(--border) rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border) bg-(--accent)">
                <th className="text-left font-semibold px-4 py-3 text-(--foreground)">
                  日時（UTC）
                </th>
                <th className="text-left font-semibold px-4 py-3 text-(--foreground)">
                  メール
                </th>
                <th className="text-left font-semibold px-4 py-3 text-(--foreground)">
                  表示名
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-(--muted)"
                  >
                    {auditEnabled
                      ? "まだ記録がありません。"
                      : "履歴を保存するには Blob トークンを設定してください。"}
                  </td>
                </tr>
              ) : (
                events.map((row, i) => (
                  <tr
                    key={`${row.loggedInAt}-${row.email}-${i}`}
                    className="border-b border-(--border) last:border-0"
                  >
                    <td className="px-4 py-2.5 text-(--foreground) whitespace-nowrap">
                      {row.loggedInAt}
                    </td>
                    <td className="px-4 py-2.5 text-(--foreground) break-all">
                      {row.email}
                    </td>
                    <td className="px-4 py-2.5 text-(--muted)">
                      {row.name ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
