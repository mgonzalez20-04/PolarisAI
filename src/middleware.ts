import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // El middleware se ejecuta en Edge Runtime, no usa bcrypt
  // La autenticación se verifica en cada página/API route
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/emails/:path*",
    "/api/cases/:path*",
  ],
};
