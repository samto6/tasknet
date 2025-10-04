"use client";

// Removes any stale Supabase auth entries in localStorage that were stored
// with a Next.js base64-encoded cookie value (prefix "base64-").
export function sanitizeSupabaseStorage() {
  if (typeof window === "undefined") return;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const match = url.match(/^https?:\/\/([^.]+)\./);
    const ref = match?.[1];
    // Supabase default storage key prefix is `sb-${ref}-auth-token`
    const keyPrefix = ref ? `sb-${ref}-auth-token` : "sb-";

    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(keyPrefix)) {
        const v = window.localStorage.getItem(k);
        if (typeof v === "string" && v.startsWith("base64-")) {
          keysToRemove.push(k);
        }
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // no-op: best effort cleanup
  }
}
