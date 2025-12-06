/**
 * RLS Tests for Team Invites Table
 * Tests: invite visibility, creation, updates, and admin-only access
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createTeamWithUsers,
  cleanup,
  uniqueId,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Team Invites RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("Team Invites RLS: only admins can see team invites", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "invites-read-",
    });
    let inviteToken;

    t.after(async () => {
      if (inviteToken) {
        await serviceClient.from("team_invites").delete().eq("token", inviteToken);
      }
      await cleanup(serviceClient, ctx);
    });

    // Admin creates an invite
    inviteToken = uniqueId();
    const { error: createErr } = await ctx.admin.client
      .from("team_invites")
      .insert({ token: inviteToken, team_id: ctx.teamId, max_uses: 10 });
    assert.equal(createErr, null, "Admin should be able to create invite");

    // Admin can see the invite they just created
    const { data: adminView, error: adminErr } = await ctx.admin.client
      .from("team_invites")
      .select("token, max_uses")
      .eq("token", inviteToken);
    assert.equal(adminErr, null, "Admin should be able to read invites");
    assert.equal(adminView.length, 1, "Admin should see the invite");

    // Member cannot see invite
    const { data: memberView } = await ctx.member.client
      .from("team_invites")
      .select("token")
      .eq("team_id", ctx.teamId);
    assert.equal(memberView.length, 0, "Member should not see invites");

    // Outsider cannot see invite
    const { data: outsiderView } = await ctx.outsider.client
      .from("team_invites")
      .select("token")
      .eq("team_id", ctx.teamId);
    assert.equal(outsiderView.length, 0, "Outsider should not see invites");
  });

  test("Team Invites RLS: only admins can create invites", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "invites-create-",
    });
    const tokens = [];

    t.after(async () => {
      for (const token of tokens) {
        await serviceClient.from("team_invites").delete().eq("token", token);
      }
      await cleanup(serviceClient, ctx);
    });

    // Admin can create
    const adminToken = uniqueId();
    const { error: adminErr } = await ctx.admin.client
      .from("team_invites")
      .insert({ token: adminToken, team_id: ctx.teamId });
    assert.equal(adminErr, null, "Admin should create invite");
    tokens.push(adminToken);

    // Member cannot create
    const memberToken = uniqueId();
    const { error: memberErr } = await ctx.member.client
      .from("team_invites")
      .insert({ token: memberToken, team_id: ctx.teamId });
    assert.ok(memberErr, "Member should not be able to create invite");

    // Outsider cannot create
    const outsiderToken = uniqueId();
    const { error: outsiderErr } = await ctx.outsider.client
      .from("team_invites")
      .insert({ token: outsiderToken, team_id: ctx.teamId });
    assert.ok(outsiderErr, "Outsider should not be able to create invite");
  });

  test("Team Invites RLS: only admins can update invites", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "invites-update-",
    });
    const token = uniqueId();

    t.after(async () => {
      await serviceClient.from("team_invites").delete().eq("token", token);
      await cleanup(serviceClient, ctx);
    });

    // Admin creates invite
    await ctx.admin.client
      .from("team_invites")
      .insert({ token, team_id: ctx.teamId, max_uses: 5 });

    // Admin can update
    const { error: adminUpdateErr } = await ctx.admin.client
      .from("team_invites")
      .update({ max_uses: 20 })
      .eq("token", token);
    assert.equal(adminUpdateErr, null, "Admin should update invite");

    // Verify update
    const { data: updated } = await ctx.admin.client
      .from("team_invites")
      .select("max_uses")
      .eq("token", token)
      .single();
    assert.equal(updated.max_uses, 20);

    // Member cannot update
    await ctx.member.client
      .from("team_invites")
      .update({ max_uses: 100 })
      .eq("token", token);

    const { data: afterMember } = await ctx.admin.client
      .from("team_invites")
      .select("max_uses")
      .eq("token", token)
      .single();
    assert.equal(afterMember.max_uses, 20, "Member update should not affect invite");
  });

  test("Team Invites RLS: invite expiration is respected", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-expire-" });
    const token = uniqueId();

    t.after(async () => {
      await serviceClient.from("team_invites").delete().eq("token", token);
      await cleanup(serviceClient, ctx);
    });

    // Create expired invite
    const expiredDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    await ctx.admin.client
      .from("team_invites")
      .insert({ token, team_id: ctx.teamId, expires_at: expiredDate });

    // Verify the invite was created
    const { data: invite } = await ctx.admin.client
      .from("team_invites")
      .select("token, expires_at")
      .eq("token", token)
      .single();
    assert.ok(invite, "Invite should exist");
    assert.ok(new Date(invite.expires_at) < new Date(), "Invite should be expired");
  });

  test("Team Invites RLS: max_uses tracking", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-uses-" });
    const token = uniqueId();

    t.after(async () => {
      await serviceClient.from("team_invites").delete().eq("token", token);
      await cleanup(serviceClient, ctx);
    });

    // Create invite with max 3 uses
    await ctx.admin.client
      .from("team_invites")
      .insert({ token, team_id: ctx.teamId, max_uses: 3, used_count: 0 });

    // Update used_count (simulating joins)
    await ctx.admin.client
      .from("team_invites")
      .update({ used_count: 2 })
      .eq("token", token);

    const { data: usage } = await ctx.admin.client
      .from("team_invites")
      .select("used_count, max_uses")
      .eq("token", token)
      .single();
    assert.equal(usage.used_count, 2);
    assert.equal(usage.max_uses, 3);
  });

  test("Team Invites RLS: cross-team isolation", async (t) => {
    const team1 = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-iso1-" });
    const team2 = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-iso2-" });
    const token1 = uniqueId();
    const token2 = uniqueId();

    t.after(async () => {
      await serviceClient.from("team_invites").delete().eq("token", token1);
      await serviceClient.from("team_invites").delete().eq("token", token2);
      await cleanup(serviceClient, team1);
      await cleanup(serviceClient, team2);
    });

    // Each team creates their own invite
    await team1.admin.client
      .from("team_invites")
      .insert({ token: token1, team_id: team1.teamId });
    await team2.admin.client
      .from("team_invites")
      .insert({ token: token2, team_id: team2.teamId });

    // Team1 admin cannot see Team2's invites
    const { data: team1View } = await team1.admin.client
      .from("team_invites")
      .select("token")
      .eq("token", token2);
    assert.equal(team1View.length, 0, "Team1 admin should not see Team2's invite");

    // Team2 admin cannot see Team1's invites
    const { data: team2View } = await team2.admin.client
      .from("team_invites")
      .select("token")
      .eq("token", token1);
    assert.equal(team2View.length, 0, "Team2 admin should not see Team1's invite");
  });

  test("Team Invites RLS: token uniqueness constraint", async (t) => {
    const team1 = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-uniq1-" });
    const team2 = await createTeamWithUsers(serviceClient, { labelPrefix: "invites-uniq2-" });
    const sharedToken = uniqueId();

    t.after(async () => {
      await serviceClient.from("team_invites").delete().eq("token", sharedToken);
      await cleanup(serviceClient, team1);
      await cleanup(serviceClient, team2);
    });

    // First team creates invite with token
    const { error: err1 } = await team1.admin.client
      .from("team_invites")
      .insert({ token: sharedToken, team_id: team1.teamId });
    assert.equal(err1, null, "First invite should succeed");

    // Second team tries same token - should fail
    const { error: err2 } = await team2.admin.client
      .from("team_invites")
      .insert({ token: sharedToken, team_id: team2.teamId });
    assert.ok(err2, "Duplicate token should fail");
  });
}
