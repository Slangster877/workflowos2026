export { default as proxy } from "next-auth/middleware";

// Everything requires sign-in except the login page, auth endpoints, and health check.
export const config = {
  matcher: ["/((?!login|approve|api/auth|api/health|api/public|_next/static|_next/image|favicon.ico).*)"],
};
