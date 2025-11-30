"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { sanitizeSupabaseStorage } from "@/lib/supabase/cleanup";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Clean up any stale base64-encoded storage entries from earlier runs
    sanitizeSupabaseStorage();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = supabaseBrowser();
    // Use current origin for local dev, allowing magic links to work on localhost
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-sage-green">Task</span>
            <span className="text-foreground">Net</span>
          </h1>
          <p className="text-muted">Tidy teamwork in one place</p>
        </div>

        {/* Card */}
        <div className="bg-background border-2 border-border rounded-[12px] shadow-[8px_8px_0px_rgba(45,49,66,0.1)] p-6 md:p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-sage-green/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-sage-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Check your email</h2>
                <p className="text-muted">
                  We&apos;ve sent a magic link to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                Send another link
              </Button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Sign in to TaskNet</h2>
                <p className="text-sm text-muted">
                  Enter your email to receive a magic link
                </p>
              </div>

              <Input
                label="Email address"
                type="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Send magic link
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-6">
          By signing in, you agree to our terms and privacy policy
        </p>
      </div>
    </main>
  );
}
