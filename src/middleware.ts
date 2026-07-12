import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets and the gate page from redirect loops
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/gate" ||
    pathname.startsWith("/api/gate")
  ) {
    return NextResponse.next();
  }

  const sharedSecret = process.env.SHARED_SECRET;
  
  // If no secret is set, we bypass protection (but we've configured one in .env)
  if (!sharedSecret) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get("shared_secret_session")?.value;

  if (cookieValue !== sharedSecret) {
    const gateUrl = new URL("/gate", request.url);
    return NextResponse.redirect(gateUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except public API endpoints or static folders
    "/((?!api/public|_next/static|_next/image|favicon.ico).*)",
  ],
};
