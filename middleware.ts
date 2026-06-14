export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/debate/:path*", "/skills/:path*", "/tests/:path*", "/coach/:path*", "/admin/:path*"]
};
