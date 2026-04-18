import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFRESH = "mavuno_refresh";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/agent")) {
    return NextResponse.next();
  }
  if (!request.cookies.get(REFRESH)?.value) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
};
