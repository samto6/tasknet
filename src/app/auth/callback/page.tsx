"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Support both PKCE flow (code) and token hash flow
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Derive initial error from URL params (no useEffect needed)
  const initialError = useMemo(() => {
    if (errorParam) {
      return errorDescription
        ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        : "Authentication failed";
    }
    if (!code && (!token_hash || !type)) {
      return "Invalid or missing authentication token";
    }
    return null;
  }, [code, token_hash, type, errorParam, errorDescription]);

  // Use runtime error if set, otherwise use initial error
  const error = runtimeError ?? initialError;

  const handleConfirm = async () => {
    setIsLoading(true);
    setRuntimeError(null);

    try {
      const supabase = supabaseBrowser();

      // Check if already authenticated (e.g., via auto-detection from hash fragment)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.refresh();
        router.push("/dashboard");
        return;
      }

      if (token_hash && type) {
        // Token hash flow - verify OTP
        const { error: authError } = await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });

        if (authError) {
          console.error("[Auth Callback] Token verification failed:", authError.message);
          setRuntimeError(authError.message || "Authentication failed");
          setIsLoading(false);
          return;
        }
      } else if (code) {
        // PKCE flow fallback - exchange code for session
        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

        if (authError) {
          console.error("[Auth Callback] Code exchange failed:", authError.message);
          setRuntimeError(authError.message || "Authentication failed");
          setIsLoading(false);
          return;
        }
      } else {
        setRuntimeError("Invalid or missing authentication token");
        setIsLoading(false);
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      console.error("[Auth Callback] Unexpected error:", err);
      setRuntimeError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <div className="text-blue-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Confirm Your Login
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Click the button below to complete your sign-in to TaskNet.
        </p>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            "Continue to Dashboard"
          )}
        </button>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
