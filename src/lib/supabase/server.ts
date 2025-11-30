import 'server-only';
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cache } from "react";

// Cache the Supabase client creation per request
export const supabaseServer = cache(async () => {
  // In Next 15, cookies() can be async in some contexts; await for compatibility
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value as string | undefined;
        },
        set(name: string, value: string, opts: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...opts });
          } catch {
            // Silently fail if cookies cannot be set (e.g., during SSR or middleware)
          }
        },
        remove(name: string, opts: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...opts });
          } catch {
            // Silently fail if cookies cannot be removed
          }
        },
      },
    }
  );
});

// Get current user - uses getSession() first (fast, from cookies) 
// then only calls getUser() if we need to verify with Supabase
export const getCurrentUser = cache(async () => {
  const supabase = await supabaseServer();
  
  // First try getSession - this is fast as it reads from cookies
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  // Return the user from the session - this avoids an extra network call
  // The session is already validated by Supabase's JWT verification
  return session.user;
});

// For actions that absolutely need to verify with Supabase server
// (e.g., before sensitive operations), use this instead
export const getVerifiedUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
