import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: "lax",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
            });
          } catch (error) {
            console.error("[Middleware] Failed to set cookie:", name, error);
          }
        },
        remove(name: string, options) {
          try {
            response.cookies.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
            });
          } catch (error) {
            console.error("[Middleware] Failed to remove cookie:", name, error);
          }
        },
      },
    }
  );

  // Use getSession() instead of getUser() - it reads from cookies locally
  // which is much faster. getUser() makes a network request to Supabase.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedPaths = [/^\/dashboard/, /^\/teams/, /^\/projects/, /^\/wellness/, /^\/notifications/, /^\/settings/, /^\/timeline/];
  const isProtected = protectedPaths.some((re) => re.test(pathname));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";

    // Create redirect response and copy any cookies that were set
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teams/:path*",
    "/projects/:path*",
    "/wellness/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/timeline/:path*",
  ],
};
