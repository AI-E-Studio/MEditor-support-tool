import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { UserMenu } from "@/components/UserMenu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-(--background)">
      <header className="bg-white border-b border-(--border) sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-(--muted) uppercase tracking-wide">
                管理者
              </p>
              <h1 className="text-xl font-bold text-(--foreground)">管理画面</h1>
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
          <AdminNav />
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
