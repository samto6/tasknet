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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/confirm`,
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Floating Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-sage-green/10 rounded-full blur-2xl animate-float" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-soft-lavender/10 rounded-full blur-2xl animate-float-delayed" />
        </div>

        <div className="relative bg-surface border-2 border-border rounded-[12px] p-8 shadow-[6px_6px_0px_rgba(45,49,66,0.15)]">
          <div className="text-center mb-8">
            <h1 className="heading-2 mb-2">Get Started with TaskNest</h1>
            <p className="text-muted">Create your account and start organizing your team</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-mint-green/10 border-2 border-mint-green/30 rounded-[8px]">
                <p className="text-foreground font-medium mb-2">Check your email!</p>
                <p className="text-sm text-muted">
                  We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link to complete your signup.
                </p>
              </div>
              <p className="text-sm text-muted">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-sage-green font-medium hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
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
                label="Email"
                type="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error && !error.includes("name") ? error : undefined}
                hint="We'll send you a magic link to sign in"
              />

              <Button
                type="submit"
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

        <p className="text-center text-sm text-muted mt-6">
          By signing up, you agree to use TaskNest responsibly for organizing your student team projects.
        </p>
      </div>
    </div>
  );
}
