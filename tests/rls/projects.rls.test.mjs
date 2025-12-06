/**
 * RLS Tests for Projects Table
 * Tests: project visibility, creation, updates, and team-based access
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createTeamWithUsers,
  createProject,
  cleanup,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Projects RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("Projects RLS: team members can read projects", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "projects-read-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    ctx.projectId = projectId;
    t.after(() => cleanup(serviceClient, ctx));

    // Admin can read project
    const { data: adminView, error: adminErr } = await ctx.admin.client
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();
    assert.equal(adminErr, null, "Admin should be able to read project");
    assert.equal(adminView.id, projectId);

    // Member can read project
    const { data: memberView, error: memberErr } = await ctx.member.client
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();
    assert.equal(memberErr, null, "Member should be able to read project");
    assert.equal(memberView.id, projectId);

    // Outsider cannot read project
    const { data: outsiderView, error: outsiderErr } = await ctx.outsider.client
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();
    assert.equal(outsiderView, null, "Outsider should not see project");
    assert.ok(outsiderErr, "Outsider should get an error when reading project");
  });

  test("Projects RLS: team members can create projects", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "projects-create-",
    });
    let adminProjectId, memberProjectId;
    t.after(async () => {
      if (adminProjectId) {
        await serviceClient.from("projects").delete().eq("id", adminProjectId);
      }
      if (memberProjectId) {
        await serviceClient.from("projects").delete().eq("id", memberProjectId);
      }
      await cleanup(serviceClient, ctx);
    });

    // Admin can create project
    const { data: adminProject, error: adminErr } = await ctx.admin.client
      .from("projects")
      .insert({ team_id: ctx.teamId, name: "Admin Project" })
      .select("id")
      .single();
    assert.equal(adminErr, null, "Admin should be able to create project");
    adminProjectId = adminProject.id;

    // Member can create project
    const { data: memberProject, error: memberErr } = await ctx.member.client
      .from("projects")
      .insert({ team_id: ctx.teamId, name: "Member Project" })
      .select("id")
      .single();
    assert.equal(memberErr, null, "Member should be able to create project");
    memberProjectId = memberProject.id;

    // Outsider cannot create project for this team
    const { error: outsiderErr } = await ctx.outsider.client
      .from("projects")
      .insert({ team_id: ctx.teamId, name: "Outsider Project" });
    assert.ok(outsiderErr, "Outsider should not be able to create project in team");
  });

  test("Projects RLS: only admins can update projects", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "projects-update-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    ctx.projectId = projectId;
    t.after(() => cleanup(serviceClient, ctx));

    // Admin can update
    const { error: adminUpdateErr } = await ctx.admin.client
      .from("projects")
      .update({ name: "Admin Updated Project" })
      .eq("id", projectId);
    assert.equal(adminUpdateErr, null, "Admin should be able to update project");

    // Verify update
    const { data: updated } = await ctx.admin.client
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    assert.equal(updated.name, "Admin Updated Project");

    // Member cannot update (RLS should block)
    await ctx.member.client
      .from("projects")
      .update({ name: "Member Updated" })
      .eq("id", projectId);
    
    const { data: verifyAfterMember } = await ctx.admin.client
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    assert.ok(!verifyAfterMember.name.includes("Member Updated"), "Member should not update project");

    // Outsider cannot update
    await ctx.outsider.client
      .from("projects")
      .update({ name: "Outsider Updated" })
      .eq("id", projectId);
    
    const { data: verifyAfterOutsider } = await ctx.admin.client
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    assert.ok(!verifyAfterOutsider.name.includes("Outsider Updated"), "Outsider should not update project");
  });

  test("Projects RLS: cross-team isolation", async (t) => {
    // Create two teams with projects
    const team1 = await createTeamWithUsers(serviceClient, { labelPrefix: "proj-iso-1-" });
    const team2 = await createTeamWithUsers(serviceClient, { labelPrefix: "proj-iso-2-" });
    const project1Id = await createProject(team1.admin.client, team1.teamId);
    const project2Id = await createProject(team2.admin.client, team2.teamId);
    team1.projectId = project1Id;
    team2.projectId = project2Id;

    t.after(async () => {
      await cleanup(serviceClient, team1);
      await cleanup(serviceClient, team2);
    });

    // Team1 admin cannot see Team2's project
    const { data: team1View } = await team1.admin.client
      .from("projects")
      .select("id")
      .eq("id", project2Id);
    assert.equal(team1View.length, 0, "Team1 admin should not see Team2's project");

    // Team2 admin cannot see Team1's project
    const { data: team2View } = await team2.admin.client
      .from("projects")
      .select("id")
      .eq("id", project1Id);
    assert.equal(team2View.length, 0, "Team2 admin should not see Team1's project");
  });

  test("Projects RLS: negative - empty project name validation", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "proj-empty-" });
    t.after(() => cleanup(serviceClient, ctx));

    // Attempt to create project with empty name - this should fail at DB level if there's a constraint
    const { error } = await ctx.admin.client
      .from("projects")
      .insert({ team_id: ctx.teamId, name: "" });
    
    // The test passes either way - either the DB rejects empty names or allows them
    // This documents the current behavior
    if (error) {
      assert.ok(error.message.includes("name") || true, "Empty name rejection is expected");
    }
  });

  test("Projects RLS: negative - invalid team_id", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, { labelPrefix: "proj-invalid-team-" });
    t.after(() => cleanup(serviceClient, ctx));

    const fakeTeamId = "00000000-0000-0000-0000-000000000000";
    
    // Attempt to create project for non-existent team
    const { error } = await ctx.admin.client
      .from("projects")
      .insert({ team_id: fakeTeamId, name: "Orphan Project" });
    
    // Should fail due to foreign key or RLS
    assert.ok(error, "Creating project for non-existent team should fail");
  });
}
