import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = [
  ["SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
].filter(([, value]) => !value);

if (missingEnv.length) {
  test("Milestones RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function createAuthedClient(label) {
    const email = `${label}.${Date.now()}@example.com`;
    const password = `Pw-${Math.random().toString(36).slice(2, 10)}A!`;

    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw new Error(`Failed to create auth user: ${createErr.message}`);
    const userId = created.user?.id;
    if (!userId) throw new Error("Auth user missing id");

    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: true },
    });
    const { data: signedIn, error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`Failed to sign in user: ${signInErr.message}`);
    if (!signedIn.session) throw new Error("Supabase session missing");
    await client.auth.setSession({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
    });

    const profile = { id: userId, email, name: `${label} Tester` };
    const { error: profileErr } = await client.from("users").upsert(profile);
    if (profileErr) throw new Error(`Failed to upsert user profile: ${profileErr.message}`);

    return { client, user: signedIn.user, session: signedIn.session };
  }

  async function provisionTeamWithProject() {
    const admin = await createAuthedClient("admin-milestone");
    const member = await createAuthedClient("member-milestone");
    const outsider = await createAuthedClient("outsider-milestone");
    const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10);

    // Create team
    const { data: team, error: teamErr } = await serviceClient
      .from("teams")
      .insert({ name: `Milestone RLS Team ${Date.now()}`, invite_code: inviteCode })
      .select("id")
      .single();
    if (teamErr) throw new Error(`Team insert failed: ${teamErr.message}`);

    // Add admin membership
    await serviceClient.from("memberships").upsert(
      { user_id: admin.user.id, team_id: team.id, role: "admin" },
      { onConflict: "user_id,team_id" }
    );

    // Add member membership
    await serviceClient.from("memberships").upsert(
      { user_id: member.user.id, team_id: team.id, role: "member" },
      { onConflict: "user_id,team_id" }
    );

    // Create project
    const { data: project, error: projectErr } = await admin.client
      .from("projects")
      .insert({ team_id: team.id, name: `Milestone Test Project ${Date.now()}` })
      .select("id")
      .single();
    if (projectErr) throw new Error(`Project insert failed: ${projectErr.message}`);

    return { admin, member, outsider, teamId: team.id, projectId: project.id };
  }

  async function cleanup(ctx) {
    await Promise.allSettled([
      serviceClient.from("milestones").delete().eq("project_id", ctx.projectId),
      serviceClient.from("projects").delete().eq("id", ctx.projectId),
      serviceClient.from("memberships").delete().eq("team_id", ctx.teamId),
      serviceClient.from("teams").delete().eq("id", ctx.teamId),
    ]);
    await Promise.allSettled([
      serviceClient.auth.admin.deleteUser(ctx.admin.user.id),
      serviceClient.auth.admin.deleteUser(ctx.member.user.id),
      serviceClient.auth.admin.deleteUser(ctx.outsider.user.id),
    ]);
  }

  test("Milestones RLS: only admins can create milestones", async (t) => {
    const ctx = await provisionTeamWithProject();
    t.after(() => cleanup(ctx));

    // Admin can create milestone
    const { data: milestone, error: adminErr } = await ctx.admin.client
      .from("milestones")
      .insert({ project_id: ctx.projectId, title: "Sprint 1", due_at: new Date().toISOString() })
      .select("id, title")
      .single();
    assert.equal(adminErr, null, "Admin should be able to create milestone");
    assert.equal(milestone.title, "Sprint 1");

    // Member cannot create milestone
    const { error: memberErr } = await ctx.member.client
      .from("milestones")
      .insert({ project_id: ctx.projectId, title: "Member Milestone" });
    assert.ok(memberErr, "Member should not be able to create milestone");

    // Outsider cannot create milestone
    const { error: outsiderErr } = await ctx.outsider.client
      .from("milestones")
      .insert({ project_id: ctx.projectId, title: "Outsider Milestone" });
    assert.ok(outsiderErr, "Outsider should not be able to create milestone");
  });

  test("Milestones RLS: team members can read milestones", async (t) => {
    const ctx = await provisionTeamWithProject();
    t.after(() => cleanup(ctx));

    // Admin creates milestone
    await ctx.admin.client
      .from("milestones")
      .insert({ project_id: ctx.projectId, title: "Readable Milestone" });

    // Admin can read
    const { data: adminView, error: adminErr } = await ctx.admin.client
      .from("milestones")
      .select("title")
      .eq("project_id", ctx.projectId);
    assert.equal(adminErr, null);
    assert.equal(adminView.length, 1);

    // Member can read
    const { data: memberView, error: memberErr } = await ctx.member.client
      .from("milestones")
      .select("title")
      .eq("project_id", ctx.projectId);
    assert.equal(memberErr, null);
    assert.equal(memberView.length, 1);

    // Outsider cannot read
    const { data: outsiderView } = await ctx.outsider.client
      .from("milestones")
      .select("title")
      .eq("project_id", ctx.projectId);
    assert.equal(outsiderView?.length ?? 0, 0, "Outsider should not see milestones");
  });

  test("Milestones RLS: only admins can update milestones", async (t) => {
    const ctx = await provisionTeamWithProject();
    t.after(() => cleanup(ctx));

    // Admin creates milestone
    const { data: milestone } = await ctx.admin.client
      .from("milestones")
      .insert({ project_id: ctx.projectId, title: "Update Test" })
      .select("id")
      .single();

    // Admin can update
    const { data: updated, error: adminErr } = await ctx.admin.client
      .from("milestones")
      .update({ status: "done" })
      .eq("id", milestone.id)
      .select("status")
      .single();
    assert.equal(adminErr, null);
    assert.equal(updated.status, "done");

    // Member cannot update
    const { error: _memberErr } = await ctx.member.client
      .from("milestones")
      .update({ title: "Hacked" })
      .eq("id", milestone.id);
    // Note: RLS may return success with 0 rows affected rather than error
    const { data: checkMember } = await ctx.admin.client
      .from("milestones")
      .select("title")
      .eq("id", milestone.id)
      .single();
    assert.equal(checkMember.title, "Update Test", "Member should not be able to update milestone");
  });
}
