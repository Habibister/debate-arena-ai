import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/home",
  "/compete",
  "/training",
  "/dashboard",
  "/assignments",
  "/debate",
  "/skills",
  "/tests",
  "/study",
  "/study-arcade",
  "/resources",
  "/teams",
  "/coach",
  "/admin",
  "/profile"
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token && isProtectedPath(pathname)) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (token && (pathname === "/signin" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/home",
    "/compete/:path*",
    "/compete",
    "/training/:path*",
    "/training",
    "/dashboard/:path*",
    "/assignments/:path*",
    "/debate/:path*",
    "/skills/:path*",
    "/tests/:path*",
    "/study/:path*",
    "/study-arcade/:path*",
    "/resources/:path*",
    "/teams/:path*",
    "/coach/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/signin",
    "/signup"
  ]
};
