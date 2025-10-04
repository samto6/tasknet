import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Create the redirect response up-front so we can attach cookies to it
  const redirectUrl = new URL("/dashboard", req.url);
  const res = NextResponse.redirect(redirectUrl);

  // Serialize cookies manually to avoid Next.js base64 wrapping, which
  // breaks Supabase's JSON parsing in the browser helper.
  function serializeCookie(
    name: string,
    value: string,
    options: CookieOptions = {}
  ) {
    const segments: string[] = [];
    // Encode value to be cookie-safe; Supabase expects to JSON.parse after decode
    const encoded = encodeURIComponent(value);
    segments.push(`${name}=${encoded}`);
    if (options.maxAge !== undefined) segments.push(`Max-Age=${options.maxAge}`);
    if (options.expires) segments.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.path) segments.push(`Path=${options.path}`);
    else segments.push(`Path=/`);
    if (options.domain) segments.push(`Domain=${options.domain}`);
    if (options.sameSite) {
      const ss = typeof options.sameSite === "string" ? options.sameSite : (options.sameSite === true ? "Strict" : "Lax");
      // Normalize case
      const normalized = ss.charAt(0).toUpperCase() + ss.slice(1).toLowerCase();
      segments.push(`SameSite=${normalized}`);
    }
    if (options.secure) segments.push("Secure");
    if (options.httpOnly) segments.push("HttpOnly");
    return segments.join("; ");
  }

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

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Return the redirect response with any Set-Cookie headers
  return res;
}
