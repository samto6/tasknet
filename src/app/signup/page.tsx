"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { sanitizeSupabaseStorage } from "@/lib/supabase/cleanup";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sanitizeSupabaseStorage();
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = supabaseBrowser();

    // Send magic link for signup
    const { error: signupError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
        data: {
          name, // Store name in user metadata
        },
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
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
                  setName("");
                }}
                className="w-full"
              >
                Send another link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Create your account</h2>
                <p className="text-sm text-muted">
                  Enter your details to get started
                </p>
              </div>

              <Input
                label="Full Name"
                type="text"
                required
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={error && error.includes("name") ? error : undefined}
              />

              <Input
                label="Email address"
                type="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error && !error.includes("name") ? error : undefined}
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Sign Up
              </Button>

              <div className="text-center text-sm text-muted">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-sage-green font-medium hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-6">
          By signing up, you agree to our terms and privacy policy
        </p>
      </div>
    </main>
  );
}
