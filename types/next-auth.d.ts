import "next-auth";

declare module "next-auth" {
  interface Session {
    requirePasswordChange: boolean;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    requirePasswordChange?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    requirePasswordChange: boolean;
  }
}
