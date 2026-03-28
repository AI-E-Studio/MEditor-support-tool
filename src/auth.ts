import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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
  callbacks: {
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;

      if (path.startsWith("/api/auth")) {
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
  },
});
