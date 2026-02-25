import NextAuth from "next-auth";
import { buildAuthOptions } from "@/auth";

async function handler(req: Request, ctx: any) {
  const authOptions = await buildAuthOptions();
  return NextAuth(req as any, ctx, authOptions) as any;
}

export { handler as GET, handler as POST };
