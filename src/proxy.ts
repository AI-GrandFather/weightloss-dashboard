import { NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const secret = process.env.SHARED_SECRET;
  const isGate = request.nextUrl.pathname === "/gate";

  if (!secret) {
    if (isGate) return NextResponse.next();
    return NextResponse.redirect(new URL("/gate?error=configuration", request.url));
  }

  const authenticated = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (authenticated) {
    if (isGate) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (isGate) return NextResponse.next();
  return NextResponse.redirect(new URL("/gate", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
