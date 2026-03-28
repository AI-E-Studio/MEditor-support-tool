"use client";

import { signOut, useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="text-sm text-(--muted)">読み込み中…</span>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-(--muted) truncate max-w-[200px]">
        {session.user.email ?? session.user.name}
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-(--primary) hover:underline cursor-pointer"
      >
        ログアウト
      </button>
    </div>
  );
}
