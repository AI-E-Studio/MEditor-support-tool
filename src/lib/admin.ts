/** デフォルトの管理者（環境変数未設定でも有効） */
const DEFAULT_ADMIN_EMAILS = ["giant.strong1@gmail.com"];

/**
 * 管理者メール一覧（小文字）。ADMIN_EMAILS はカンマ区切りで追加可能。
 */
export function getAdminEmails(): Set<string> {
  const fromEnv =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return new Set([
    ...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...fromEnv,
  ]);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.trim().toLowerCase());
}
