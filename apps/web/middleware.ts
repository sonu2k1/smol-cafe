import { NextRequest, NextResponse } from "next/server";

const STAFF_SESSION_COOKIE = "smol_staff_session";

// Role → allowed routes mapping
const ROLE_ROUTES: Record<string, string[]> = {
  kitchen: ["/kitchen"],
  cashier: ["/cashier"],
  admin: ["/admin"],
  super_admin: ["/admin", "/kitchen", "/cashier"],
  authenticated: ["/admin", "/kitchen", "/cashier"],
};

// Protected staff routes that require authentication
const PROTECTED_PREFIXES = ["/kitchen", "/cashier", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected staff route
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Read the staff session cookie
  const staffRole = request.cookies.get(STAFF_SESSION_COOKIE)?.value?.toLowerCase();

  // No session → redirect to /smol-backdoor
  if (!staffRole) {
    const backdoorUrl = new URL("/smol-backdoor", request.url);
    return NextResponse.redirect(backdoorUrl);
  }

  // Check role has permission for this route
  const allowedRoutes = ROLE_ROUTES[staffRole] ?? [];
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    // Role is set but wrong — redirect back to backdoor to pick the right role
    const backdoorUrl = new URL("/smol-backdoor", request.url);
    return NextResponse.redirect(backdoorUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/kitchen/:path*", "/cashier/:path*", "/admin/:path*"],
};
