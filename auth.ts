import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

async function getGitHubCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const [idRow, secretRow] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: "github_client_id" } }),
    prisma.appConfig.findUnique({ where: { key: "github_client_secret" } }),
  ]);
  if (!idRow?.value || !secretRow?.value) return null;
  try {
    return { clientId: idRow.value, clientSecret: decrypt(secretRow.value) };
  } catch {
    return null;
  }
}

export async function buildAuthOptions(): Promise<NextAuthOptions> {
  const ghCreds = await getGitHubCredentials();

  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !user.passwordHash) return null;
        if (!user.passwordLoginEnabled) throw new Error("密码登录已禁用");
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.username,
          email: user.username,
          requirePasswordChange: user.requirePasswordChange,
        };
      },
    }),
  ];

  if (ghCreds) {
    providers.push(
      GitHubProvider({
        clientId: ghCreds.clientId,
        clientSecret: ghCreds.clientSecret,
        async profile(profile) {
          const whitelist = await prisma.appConfig.findUnique({
            where: { key: "github_whitelist" },
          });
          if (!whitelist || whitelist.value !== profile.login) {
            throw new Error("GitHub 账号不在白名单中");
          }
          let user = await prisma.user.findUnique({
            where: { githubId: String(profile.id) },
          });
          if (!user) {
            const admin = await prisma.user.findUnique({ where: { username: "admin" } });
            if (admin && !admin.githubId) {
              user = await prisma.user.update({
                where: { id: admin.id },
                data: { githubId: String(profile.id), githubUsername: profile.login },
              });
            }
          }
          if (!user) throw new Error("用户不存在");
          return {
            id: user.id,
            name: user.username,
            email: user.username,
            requirePasswordChange: user.requirePasswordChange,
          };
        },
      })
    );
  }

  return {
    session: { strategy: "jwt" },
    providers,
    callbacks: {
      async signIn({ user }) {
        if (user?.id) {
          await logAudit({
            action: "AUTH_LOGIN",
            description: `用户 ${user.name || "unknown"} 登录`,
            userId: user.id,
            username: user.name || "unknown",
          });
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.userId = user.id;
          token.requirePasswordChange = (user as any).requirePasswordChange ?? false;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.userId;
        }
        (session as any).requirePasswordChange = token.requirePasswordChange;
        return session;
      },
    },
    pages: { signIn: "/login" },
    debug: process.env.NODE_ENV === "development",
  };
}

// Static fallback for getServerSession (used by lib/auth.ts)
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize() { return null; },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.requirePasswordChange = (user as any).requirePasswordChange ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
      }
      (session as any).requirePasswordChange = token.requirePasswordChange;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
