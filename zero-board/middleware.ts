import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow public access to login page
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // For all other routes, we'll handle auth in the page components
  // since we need client-side auth state
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

