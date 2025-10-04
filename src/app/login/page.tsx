"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { sanitizeSupabaseStorage } from "@/lib/supabase/cleanup";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Clean up any stale base64-encoded storage entries from earlier runs
    sanitizeSupabaseStorage();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
      },
    });
    if (error) alert(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in to TaskNest</h1>
      {sent ? (
        <p>Check your email for the magic link.</p>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <input
            className="border w-full p-2 rounded"
            type="email"
            required
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="bg-black text-white px-4 py-2 rounded">
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
