import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";
import { getAdminEmails } from "@/lib/admin";
import { recordLoginEvent } from "@/lib/loginAudit";

/** 本番では AUTH_SECRET（または NEXTAUTH_SECRET）が必須。未設定だと /api/auth/* で「Server configuration」エラーになる */
const authSecret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: authSecret,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      await recordLoginEvent({
        email: user.email ?? "",
        name: user.name ?? null,
      });
    },
  },
  callbacks: {
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;

      if (path.startsWith("/api/auth")) {
        return true;
      }

      if (path.startsWith("/api/admin")) {
        if (!auth?.user?.email) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!getAdminEmails().has(auth.user.email.toLowerCase())) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return true;
      }

      if (path.startsWith("/admin")) {
        if (!auth?.user?.email) {
          return NextResponse.redirect(
            new URL("/login?callbackUrl=/admin", request.nextUrl)
          );
        }
        if (!getAdminEmails().has(auth.user.email.toLowerCase())) {
          return NextResponse.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      if (path === "/login") {
        if (auth?.user) {
          return NextResponse.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      if (path.startsWith("/api/")) {
        if (!auth?.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return true;
      }

      return !!auth?.user;
    },
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email) as string | undefined;
      if (email) {
        token.email = email;
        token.isAdmin = getAdminEmails().has(email.toLowerCase());
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
