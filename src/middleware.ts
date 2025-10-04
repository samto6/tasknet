import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Helper to serialize cookies without Next.js base64 wrapping
  function serializeCookie(
    name: string,
    value: string,
    options: CookieOptions = {}
  ) {
    const segments: string[] = [];
    const encoded = encodeURIComponent(value);
    segments.push(`${name}=${encoded}`);
    if (options.maxAge !== undefined) segments.push(`Max-Age=${options.maxAge}`);
    if (options.expires) segments.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.path) segments.push(`Path=${options.path}`);
    else segments.push(`Path=/`);
    if (options.domain) segments.push(`Domain=${options.domain}`);
    if (options.sameSite) {
      const ss = typeof options.sameSite === "string" ? options.sameSite : (options.sameSite === true ? "Strict" : "Lax");
      const normalized = ss.charAt(0).toUpperCase() + ss.slice(1).toLowerCase();
      segments.push(`SameSite=${normalized}`);
    }
    if (options.secure) segments.push("Secure");
    if (options.httpOnly) segments.push("HttpOnly");
    return segments.join("; ");
  }

  // Use SSR client with custom cookie adapter to avoid base64-encoded cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.headers.append("Set-Cookie", serializeCookie(name, value, options));
        },
        remove(name: string, options: CookieOptions) {
          res.headers.append(
            "Set-Cookie",
            serializeCookie(name, "", { ...options, maxAge: 0, expires: new Date(0) as any })
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  const protectedPaths = [/^\/dashboard/, /^\/teams/, /^\/projects/, /^\/wellness/, /^\/notifications/];
  const isProtected = protectedPaths.some((re) => re.test(pathname));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teams/:path*",
    "/projects/:path*",
    "/wellness/:path*",
    "/notifications/:path*",
  ],
};
