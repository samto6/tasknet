import { joinTeamByCode } from "@/server-actions/teams";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const code = (params.code || "").trim();

  if (!code) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Join Team</h1>
        <p className="text-red-600">Missing invite code.</p>
        <Link href="/teams" className="text-blue-600 hover:underline mt-4 block">
          Go to Teams
        </Link>
      </main>
    );
  }

  // Check if user is authenticated
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to login - user will need to use invite link again after logging in
    redirect("/login");
  }

  // Try to join the team
  let error: string | null = null;
  try {
    await joinTeamByCode(code);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to join team";
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Join Team</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          The invite code may be invalid, expired, or already used.
        </p>
        <Link href="/teams" className="text-blue-600 hover:underline">
          Go to Teams
        </Link>
      </main>
    );
  }

  // Success - redirect to dashboard
  redirect("/dashboard");
}
