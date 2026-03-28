import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  aggregateRegisteredUsers,
  listLoginEvents,
} from "@/lib/loginAudit";
import { redirect } from "next/navigation";

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
      <h2 className="text-lg font-semibold text-(--foreground) mb-1">
        登録ユーザー一覧
      </h2>
      <p className="text-sm text-(--muted) mb-4">
        Google で少なくとも 1 回ログインしたメールを 1 人として表示します（ログイン記録から集計）。
      </p>

      {!auditEnabled && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">BLOB_READ_WRITE_TOKEN</strong>
          が未設定のため、データは表示されません。
        </div>
      )}

      <div className="bg-white border border-(--border) rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--border) bg-(--accent)">
              <th className="text-left font-semibold px-4 py-3 text-(--foreground)">
                メール
              </th>
              <th className="text-left font-semibold px-4 py-3 text-(--foreground)">
                表示名（最終ログイン時）
              </th>
              <th className="text-right font-semibold px-4 py-3 text-(--foreground) whitespace-nowrap">
                ログイン回数
              </th>
              <th className="text-left font-semibold px-4 py-3 text-(--foreground) whitespace-nowrap">
                初回（UTC）
              </th>
              <th className="text-left font-semibold px-4 py-3 text-(--foreground) whitespace-nowrap">
                最終（UTC）
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-(--muted)"
                >
                  {auditEnabled
                    ? "まだ利用者の記録がありません。"
                    : "履歴を保存するには Blob トークンを設定してください。"}
                </td>
              </tr>
            ) : (
              users.map((row) => (
                <tr
                  key={row.email}
                  className="border-b border-(--border) last:border-0"
                >
                  <td className="px-4 py-2.5 text-(--foreground) break-all">
                    {row.email}
                  </td>
                  <td className="px-4 py-2.5 text-(--muted)">
                    {row.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-(--foreground) text-right tabular-nums">
                    {row.loginCount}
                  </td>
                  <td className="px-4 py-2.5 text-(--foreground) whitespace-nowrap">
                    {row.firstLoggedInAt}
                  </td>
                  <td className="px-4 py-2.5 text-(--foreground) whitespace-nowrap">
                    {row.lastLoggedInAt}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
