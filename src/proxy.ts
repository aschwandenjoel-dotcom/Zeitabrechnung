import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // /admin und /api/admin nur für Admins
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
