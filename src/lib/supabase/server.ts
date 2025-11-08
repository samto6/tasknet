import 'server-only';
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function supabaseServer() {
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
}
