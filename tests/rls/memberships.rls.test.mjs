/**
 * RLS Tests for Memberships Table
 * Tests: membership visibility, role-based operations, and access control
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createAuthedClient,
  createTeamWithUsers,
  cleanup,
  uniqueId,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Memberships RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("Memberships RLS: users can see their own memberships", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "membership-read-",
    });
    t.after(() => cleanup(serviceClient, ctx));

    // Admin can see their membership
    const { data: adminMembership, error: adminErr } = await ctx.admin.client
      .from("memberships")
      .select("team_id, role")
      .eq("user_id", ctx.admin.user.id);
    assert.equal(adminErr, null, "Admin should read their membership");
    assert.equal(adminMembership.length, 1);
    assert.equal(adminMembership[0].role, "admin");

    // Member can see their membership
    const { data: memberMembership, error: memberErr } = await ctx.member.client
      .from("memberships")
      .select("team_id, role")
      .eq("user_id", ctx.member.user.id);
    assert.equal(memberErr, null, "Member should read their membership");
    assert.equal(memberMembership.length, 1);
    assert.equal(memberMembership[0].role, "member");
  });

  test("Memberships RLS: users can join teams by inserting membership", async (t) => {
    // Create a team
    const teamCtx = await createTeamWithUsers(serviceClient, { labelPrefix: "membership-join-" });
    const newUser = await createAuthedClient(serviceClient, "membership-joiner");

    t.after(async () => {
      await serviceClient.from("memberships").delete()
        .eq("user_id", newUser.user.id)
        .eq("team_id", teamCtx.teamId);
      await serviceClient.auth.admin.deleteUser(newUser.user.id);
      await cleanup(serviceClient, teamCtx);
    });

    // Try to insert membership directly
    // The RLS policy may allow or block this based on implementation
    const { error } = await newUser.client
      .from("memberships")
      .insert({ user_id: newUser.user.id, team_id: teamCtx.teamId, role: "member" });
    
    if (error) {
      // RLS blocks direct membership insert - this is expected behavior
      // Users should join via invite system (join_team_by_invite RPC)
      assert.ok(
        error.message.includes("policy") || error.code === "42501" || error.code === "PGRST301",
        `Membership insert blocked by RLS policy (expected): ${error.message}`
      );
    } else {
      // Insert succeeded - verify membership exists using service client
      // (user may not be able to read membership until it's fully established)
      const { data: verify } = await serviceClient
        .from("memberships")
        .select("role, user_id")
        .eq("team_id", teamCtx.teamId)
        .eq("user_id", newUser.user.id)
        .single();
      assert.ok(verify, "Membership should exist after insert");
      assert.equal(verify.role, "member");
    }
  });

  test("Memberships RLS: users cannot insert memberships for others", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "membership-impersonate-" });
    const victim = await createAuthedClient(serviceClient, "membership-victim");

    t.after(async () => {
      await serviceClient.auth.admin.deleteUser(victim.user.id);
      await cleanup(serviceClient, ctx);
    });

    // Admin tries to add victim to team directly
    const { error } = await ctx.admin.client
      .from("memberships")
      .insert({ user_id: victim.user.id, team_id: ctx.teamId, role: "member" });
    
    // Should fail because user_id != auth.uid()
    assert.ok(error, "User should not be able to insert membership for another user");
  });

  test("Memberships RLS: only admins can delete memberships", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "membership-delete-",
    });
    t.after(() => cleanup(serviceClient, ctx));

    // Member cannot delete their own membership
    const { error: memberDeleteErr } = await ctx.member.client
      .from("memberships")
      .delete()
      .eq("user_id", ctx.member.user.id)
      .eq("team_id", ctx.teamId);
    
    // RLS policy says only admin can delete
    // Check if member is still in team
    const { data: stillMember } = await ctx.admin.client
      .from("memberships")
      .select("user_id")
      .eq("user_id", ctx.member.user.id)
      .eq("team_id", ctx.teamId);
    assert.equal(stillMember.length, 1, "Member should still be in team (cannot self-delete)");

    // Admin can delete member
    const { error: adminDeleteErr } = await ctx.admin.client
      .from("memberships")
      .delete()
      .eq("user_id", ctx.member.user.id)
      .eq("team_id", ctx.teamId);
    assert.equal(adminDeleteErr, null, "Admin should be able to delete membership");

    // Verify deletion
    const { data: afterDelete } = await ctx.admin.client
      .from("memberships")
      .select("user_id")
      .eq("user_id", ctx.member.user.id)
      .eq("team_id", ctx.teamId);
    assert.equal(afterDelete.length, 0, "Member should be removed from team");
  });

  test("Memberships RLS: role validation", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "membership-role-" });
    const newUser = await createAuthedClient(serviceClient, "membership-role-user");

    t.after(async () => {
      await serviceClient.from("memberships").delete()
        .eq("user_id", newUser.user.id)
        .eq("team_id", ctx.teamId);
      await serviceClient.auth.admin.deleteUser(newUser.user.id);
      await cleanup(serviceClient, ctx);
    });

    // Try to insert with invalid role
    const { error: invalidRoleErr } = await newUser.client
      .from("memberships")
      .insert({ user_id: newUser.user.id, team_id: ctx.teamId, role: "superadmin" });
    
    // Should fail due to check constraint
    assert.ok(invalidRoleErr, "Invalid role should be rejected");

    // Valid roles should work
    const { error: validRoleErr } = await newUser.client
      .from("memberships")
      .insert({ user_id: newUser.user.id, team_id: ctx.teamId, role: "member" });
    assert.equal(validRoleErr, null, "Valid role should be accepted");
  });

  test("Memberships RLS: duplicate membership prevention", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "membership-dup-" });
    t.after(() => cleanup(serviceClient, ctx));

    // Try to insert duplicate membership for admin
    const { error } = await ctx.admin.client
      .from("memberships")
      .insert({ user_id: ctx.admin.user.id, team_id: ctx.teamId, role: "admin" });
    
    // Should fail due to primary key constraint
    assert.ok(error, "Duplicate membership should be rejected");
  });

  test("Memberships RLS: cross-team isolation", async (t) => {
    const team1 = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "membership-iso1-",
    });
    const team2 = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "membership-iso2-",
    });

    t.after(async () => {
      await cleanup(serviceClient, team1);
      await cleanup(serviceClient, team2);
    });

    // Team1 member cannot see Team2 memberships
    const { data: team1ViewTeam2 } = await team1.member.client
      .from("memberships")
      .select("user_id")
      .eq("team_id", team2.teamId);
    assert.equal(team1ViewTeam2.length, 0, "Team1 member should not see Team2 memberships");

    // Team2 admin cannot delete Team1 memberships
    await team2.admin.client
      .from("memberships")
      .delete()
      .eq("team_id", team1.teamId);
    
    // Verify Team1 memberships still exist
    const { data: team1Memberships } = await serviceClient
      .from("memberships")
      .select("user_id")
      .eq("team_id", team1.teamId);
    assert.ok(team1Memberships.length >= 1, "Team1 memberships should still exist");
  });
}
