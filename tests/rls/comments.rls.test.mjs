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
  test("Comments RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
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

  async function provisionTeamWithTask() {
    const admin = await createAuthedClient("admin-comments");
    const member = await createAuthedClient("member-comments");
    const outsider = await createAuthedClient("outsider-comments");
    const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10);

    // Create team
    const { data: team, error: teamErr } = await serviceClient
      .from("teams")
      .insert({ name: `Comments RLS Team ${Date.now()}`, invite_code: inviteCode })
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
      .insert({ team_id: team.id, name: `Comments Test Project ${Date.now()}` })
      .select("id")
      .single();
    if (projectErr) throw new Error(`Project insert failed: ${projectErr.message}`);

    // Create task
    const { data: task, error: taskErr } = await admin.client
      .from("tasks")
      .insert({ project_id: project.id, title: "Comment test task", created_by: admin.user.id })
      .select("id")
      .single();
    if (taskErr) throw new Error(`Task insert failed: ${taskErr.message}`);

    return { admin, member, outsider, teamId: team.id, projectId: project.id, taskId: task.id };
  }

  async function cleanup(ctx) {
    await Promise.allSettled([
      serviceClient.from("task_comments").delete().eq("task_id", ctx.taskId),
      serviceClient.from("tasks").delete().eq("id", ctx.taskId),
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

  test("Comments RLS: team members can add and read comments", async (t) => {
    const ctx = await provisionTeamWithTask();
    t.after(() => cleanup(ctx));

    // Admin can add comment
    const { data: adminComment, error: adminErr } = await ctx.admin.client
      .from("task_comments")
      .insert({ task_id: ctx.taskId, user_id: ctx.admin.user.id, body: "Admin comment" })
      .select("id, body")
      .single();
    assert.equal(adminErr, null, "Admin should be able to add comment");
    assert.equal(adminComment.body, "Admin comment");

    // Member can add comment
    const { data: memberComment, error: memberErr } = await ctx.member.client
      .from("task_comments")
      .insert({ task_id: ctx.taskId, user_id: ctx.member.user.id, body: "Member comment" })
      .select("id, body")
      .single();
    assert.equal(memberErr, null, "Member should be able to add comment");
    assert.equal(memberComment.body, "Member comment");

    // Member can read all comments
    const { data: comments, error: readErr } = await ctx.member.client
      .from("task_comments")
      .select("id, body")
      .eq("task_id", ctx.taskId);
    assert.equal(readErr, null);
    assert.equal(comments.length, 2, "Member should see all team comments");
  });

  test("Comments RLS: non-members cannot add or read comments", async (t) => {
    const ctx = await provisionTeamWithTask();
    t.after(() => cleanup(ctx));

    // Admin adds a comment first
    await ctx.admin.client
      .from("task_comments")
      .insert({ task_id: ctx.taskId, user_id: ctx.admin.user.id, body: "Secret comment" });

    // Outsider cannot read comments
    const { data: readData, error: _readErr } = await ctx.outsider.client
      .from("task_comments")
      .select("id, body")
      .eq("task_id", ctx.taskId);
    assert.equal(readData?.length ?? 0, 0, "Outsider should not see any comments");

    // Outsider cannot add comments
    const { error: insertErr } = await ctx.outsider.client
      .from("task_comments")
      .insert({ task_id: ctx.taskId, user_id: ctx.outsider.user.id, body: "Blocked comment" });
    assert.ok(insertErr, "Outsider should not be able to insert comments");
  });
}
