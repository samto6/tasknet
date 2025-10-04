import { joinTeamByCode } from "@/server-actions/teams";
import { redirect } from "next/navigation";

export default async function JoinPage({ searchParams }: { searchParams: { code?: string } }) {
  const code = (searchParams.code || "").trim();
  if (!code) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-red-600">Missing invite code.</p>
      </main>
    );
  }
  await joinTeamByCode(code);
  redirect("/dashboard");
}
