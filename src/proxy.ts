import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate (Next.js "proxy" convention, formerly "middleware"):
 * redirects to /login when no Better Auth session cookie is present. This is a
 * cheap edge check — the authoritative session validation happens server-side in
 * the protected layout (`auth.api.getSession`).
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except the login page, the auth API, Next internals, and
  // static files (any path containing a dot, e.g. /seapollogo.png).
  matcher: ["/((?!api|_next/static|_next/image|login|.*\\.).*)"],
};
