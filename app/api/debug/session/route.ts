import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  return NextResponse.json({
    hasSession: !!session,
    session: session ? {
      user: session.user,
      requirePasswordChange: session.requirePasswordChange,
    } : null,
  });
}
