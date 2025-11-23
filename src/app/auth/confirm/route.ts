import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { EmailOtpType } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  // If no token_hash provided, redirect to login with error
  if (!token_hash || !type) {
    console.error("[Auth Confirm] Missing token_hash or type parameter");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(loginUrl);
  }

  console.log("[Auth Confirm] Processing token hash verification");

  // Create response first - we'll attach cookies to it
  const response = NextResponse.next();

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
            console.error("[Auth Confirm] Failed to set cookie:", name, error);
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
            console.error("[Auth Confirm] Failed to remove cookie:", name, error);
          }
        },
      },
    }
  );

  // Verify OTP with token hash
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  // Determine redirect destination based on result
  if (error || !data.session) {
    console.error("[Auth Confirm] Token verification failed:", error?.message || "No session returned");
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("error", "authentication_failed");
    return NextResponse.redirect(redirectUrl);
  }

  // Success - redirect to dashboard
  console.log("[Auth Confirm] Authentication successful, redirecting to dashboard");
  const redirectUrl = new URL("/dashboard", req.url);

  // Create new redirect response and copy cookies
  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
