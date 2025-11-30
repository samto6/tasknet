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
  test("RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
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
    const { data: sessionCheck, error: sessionErr } = await client.auth.getSession();
    if (sessionErr) throw new Error(`Failed to fetch session: ${sessionErr.message}`);
    if (!sessionCheck.session?.user) throw new Error("Session user missing after setSession");

    const profile = {
      id: userId,
      email,
      name: `${label} Tester`,
    };
    const { error: profileErr } = await client.from("users").upsert(profile);
    if (profileErr) throw new Error(`Failed to upsert user profile: ${profileErr.message}`);

    return { client, user: signedIn.user, session: signedIn.session }; // user contains id/email
  }

  async function provisionTeamWithTask() {
    const admin = await createAuthedClient("admin");
    const outsider = await createAuthedClient("outsider");
    const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10);

    const { data: team, error: teamErr } = await serviceClient
      .from("teams")
      .insert({ name: `RLS Team ${Date.now()}`, invite_code: inviteCode })
      .select("id")
      .single();
    if (teamErr) throw new Error(`Team insert failed: ${teamErr.message}`);

    const { error: membershipErr } = await serviceClient
      .from("memberships")
      .upsert(
        { user_id: admin.user.id, team_id: team.id, role: "admin" },
        { onConflict: "user_id,team_id" }
      );
    if (membershipErr) throw new Error(`Membership insert failed: ${membershipErr.message}`);

    const { data: project, error: projectErr } = await admin.client
      .from("projects")
      .insert({ team_id: team.id, name: `RLS Project ${Date.now()}` })
      .select("id")
      .single();
    if (projectErr) throw new Error(`Project insert failed: ${projectErr.message}`);

    const { data: task, error: taskErr } = await admin.client
      .from("tasks")
      .insert({
        project_id: project.id,
        title: "Seed task",
        created_by: admin.user.id,
      })
      .select("id, status")
      .single();
    if (taskErr) throw new Error(`Task insert failed: ${taskErr.message}`);

    return {
      admin,
      outsider,
      teamId: team.id,
      projectId: project.id,
      taskId: task.id,
    };
  }

  async function cleanup({ admin, outsider, taskId, projectId, teamId }) {
    const deletions = [
      serviceClient.from("task_comments").delete().eq("task_id", taskId),
      serviceClient.from("task_assignees").delete().eq("task_id", taskId),
      serviceClient.from("tasks").delete().eq("id", taskId),
      serviceClient.from("projects").delete().eq("id", projectId),
      serviceClient.from("teams").delete().eq("id", teamId),
    ];
    await Promise.allSettled(deletions);
    await Promise.allSettled([
      serviceClient.auth.admin.deleteUser(admin.user.id),
      serviceClient.auth.admin.deleteUser(outsider.user.id),
    ]);
  }

  test("Tasks RLS allows members and blocks non-members", async (t) => {
    const ctx = await provisionTeamWithTask();
    t.after(async () => {
      await cleanup(ctx);
    });

    const { data: visibleTask, error: visibleErr } = await ctx.admin.client
      .from("tasks")
      .select("id, status")
      .eq("id", ctx.taskId)
      .single();
    assert.equal(visibleErr, null);
    assert.equal(visibleTask.id, ctx.taskId);

    const outsiderSelect = await ctx.outsider.client
      .from("tasks")
      .select("id")
      .eq("id", ctx.taskId)
      .single();
    assert.equal(outsiderSelect.data, null);
    assert.ok(outsiderSelect.error, "Non-member should not see team tasks");

    const outsiderInsert = await ctx.outsider.client
      .from("tasks")
      .insert({ project_id: ctx.projectId, title: "Blocked task", created_by: ctx.outsider.user.id })
      .select("id")
      .single();
    assert.ok(outsiderInsert.error, "Non-member should not be able to insert tasks");

    const { data: updatedTask, error: updateErr } = await ctx.admin.client
      .from("tasks")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", ctx.taskId)
      .select("status")
      .single();
    assert.equal(updateErr, null);
    assert.equal(updatedTask.status, "done");

    const outsiderUpdate = await ctx.outsider.client
      .from("tasks")
      .update({ status: "done" })
      .eq("id", ctx.taskId)
      .select("id")
      .single();
    assert.ok(outsiderUpdate.error, "Non-member should not be able to update tasks");
  });

  test("Invite code allows a non-member to join via RPC", async (t) => {
    const admin = await createAuthedClient("admin-invite");
    const outsider = await createAuthedClient("outsider-invite");
    const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10);

    const { data: team, error: teamErr } = await serviceClient
      .from("teams")
      .insert({ name: `Invite Test Team ${Date.now()}`, invite_code: inviteCode })
      .select("id")
      .single();
    if (teamErr) throw new Error(`Team insert failed: ${teamErr.message}`);

    const { error: membershipErr } = await serviceClient
      .from("memberships")
      .upsert(
        { user_id: admin.user.id, team_id: team.id, role: "admin" },
        { onConflict: "user_id,team_id" }
      );
    if (membershipErr) throw new Error(`Membership insert failed: ${membershipErr.message}`);

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("team_invites").delete().eq("team_id", team?.id),
        serviceClient.from("memberships").delete().eq("team_id", team?.id),
        serviceClient.from("teams").delete().eq("id", team?.id),
      ]);
      await Promise.allSettled([
        serviceClient.auth.admin.deleteUser(admin.user.id),
        serviceClient.auth.admin.deleteUser(outsider.user.id),
      ]);
    });

    // The invite code is stored on the teams table, and also auto-synced to team_invites
    // Just use the invite code we created directly
    const { error: joinErr } = await outsider.client.rpc("join_team_by_token", { _token: inviteCode });
    assert.equal(joinErr, null, `Join should succeed: ${joinErr?.message}`);

    const { data: joined, error: joinedErr } = await outsider.client
      .from("memberships")
      .select("team_id, role")
      .eq("team_id", team.id)
      .eq("user_id", outsider.user.id)
      .single();
    assert.equal(joinedErr, null);
    assert.equal(joined.team_id, team.id);
    assert.equal(joined.role, "member");
  });
}
