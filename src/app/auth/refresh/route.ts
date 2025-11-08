import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });

  // Serialize cookies manually to avoid Next.js base64 wrapping
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            res.headers.append("Set-Cookie", serializeCookie(name, value, options));
          } catch {
            // Silently fail if cookies cannot be set
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            res.headers.append(
              "Set-Cookie",
              serializeCookie(name, "", { ...options, maxAge: 0, expires: new Date(0) })
            );
          } catch {
            // Silently fail if cookies cannot be removed
          }
        },
      },
    }
  );

  try {
    // Attempt to refresh the session
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return res;
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
