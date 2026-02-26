import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const session = await auth();
  return NextResponse.json({
    hasSession: !!session,
    session: session ? {
      user: session.user,
      requirePasswordChange: session.requirePasswordChange,
    } : null,
  });
}
