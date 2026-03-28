import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      /** 管理者メール一覧に含まれる場合 true */
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string;
    isAdmin?: boolean;
  }
}
