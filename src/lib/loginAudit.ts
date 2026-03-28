import { get, list, put } from "@vercel/blob";
import { randomBytes } from "node:crypto";

export type LoginAuditEntry = {
  email: string;
  name: string | null;
  loggedInAt: string;
};

const PREFIX = "audit/login/";

export async function recordLoginEvent(entry: {
  email: string;
  name: string | null;
}): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !entry.email) return;
  try {
    const id = `${Date.now()}-${randomBytes(8).toString("hex")}`;
    const body: LoginAuditEntry = {
      email: entry.email,
      name: entry.name,
      loggedInAt: new Date().toISOString(),
    };
    await put(`${PREFIX}${id}.json`, JSON.stringify(body), {
      access: "private",
      contentType: "application/json",
      token,
    });
  } catch (e) {
    console.error("recordLoginEvent:", e);
  }
}

/**
 * 直近のログイン記録（新しい順）。BLOB_READ_WRITE_TOKEN が無い場合は空配列。
 */
export async function listLoginEvents(max = 200): Promise<LoginAuditEntry[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return [];

  const { blobs } = await list({
    prefix: PREFIX,
    limit: max,
    token,
  });

  const sorted = [...blobs].sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );

  const out: LoginAuditEntry[] = [];
  for (const b of sorted) {
    try {
      const res = await get(b.pathname, {
        access: "private",
        token,
        useCache: false,
      });
      if (!res || res.statusCode !== 200 || !res.stream) continue;
      const text = await new Response(res.stream).text();
      const parsed = JSON.parse(text) as LoginAuditEntry;
      if (parsed.email) out.push(parsed);
    } catch {
      // 破損行はスキップ
    }
  }
  return out;
}

export type RegisteredUserRow = {
  email: string;
  name: string | null;
  firstLoggedInAt: string;
  lastLoggedInAt: string;
  loginCount: number;
};

/**
 * ログイン記録からメール単位で集計（同一人物の複数ログインを 1 ユーザーとして扱う）。
 */
export function aggregateRegisteredUsers(
  events: LoginAuditEntry[]
): RegisteredUserRow[] {
  const map = new Map<
    string,
    {
      canonicalEmail: string;
      first: string;
      last: string;
      count: number;
      nameAtLast: string | null;
    }
  >();

  for (const e of events) {
    const key = e.email.trim().toLowerCase();
    if (!key) continue;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        canonicalEmail: e.email.trim(),
        first: e.loggedInAt,
        last: e.loggedInAt,
        count: 1,
        nameAtLast: e.name,
      });
    } else {
      cur.count += 1;
      if (e.loggedInAt < cur.first) cur.first = e.loggedInAt;
      if (e.loggedInAt > cur.last) {
        cur.last = e.loggedInAt;
        cur.nameAtLast = e.name;
      }
    }
  }

  return Array.from(map.values())
    .map((v) => ({
      email: v.canonicalEmail,
      name: v.nameAtLast,
      firstLoggedInAt: v.first,
      lastLoggedInAt: v.last,
      loginCount: v.count,
    }))
    .sort((a, b) => b.lastLoggedInAt.localeCompare(a.lastLoggedInAt));
}
