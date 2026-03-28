import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { listLoginEvents } from "@/lib/loginAudit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await listLoginEvents(200);
  return NextResponse.json({
    events,
    auditEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
