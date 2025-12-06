/**
 * RLS Tests for Task Assignees Table
 * Tests: assignee visibility, assignment operations, and team-based access
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createTeamWithUsers,
  createProject,
  createTask,
  cleanup,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Task Assignees RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("Task Assignees RLS: team members can view assignees", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      includesOutsider: true,
      labelPrefix: "assignees-read-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Assign the member to the task
    const { error: assignErr } = await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.member.user.id });
    assert.equal(assignErr, null, "Admin should assign members");

    // Admin can see assignees
    const { data: adminView, error: adminErr } = await ctx.admin.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    assert.equal(adminErr, null);
    assert.equal(adminView.length, 1);

    // Member can see assignees
    const { data: memberView, error: memberErr } = await ctx.member.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    assert.equal(memberErr, null);
    assert.equal(memberView.length, 1);

    // Outsider cannot see assignees
    const { data: outsiderView } = await ctx.outsider.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    assert.equal(outsiderView.length, 0, "Outsider should not see assignees");
  });

  test("Task Assignees RLS: team members can assign themselves", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "assignees-self-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Member can assign themselves
    const { error } = await ctx.member.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.member.user.id });
    assert.equal(error, null, "Member should be able to self-assign");

    // Verify
    const { data: verify } = await ctx.member.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id)
      .eq("user_id", ctx.member.user.id);
    assert.equal(verify.length, 1);
  });

  test("Task Assignees RLS: team members can assign other team members", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "assignees-other-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Member assigns admin
    const { error } = await ctx.member.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.admin.user.id });
    assert.equal(error, null, "Member should be able to assign other team members");
  });

  test("Task Assignees RLS: outsiders cannot assign anyone", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesOutsider: true,
      labelPrefix: "assignees-outsider-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Outsider cannot assign themselves
    const { error: selfErr } = await ctx.outsider.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.outsider.user.id });
    assert.ok(selfErr, "Outsider should not be able to assign themselves");

    // Outsider cannot assign admin
    const { error: otherErr } = await ctx.outsider.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.admin.user.id });
    assert.ok(otherErr, "Outsider should not be able to assign others");
  });

  test("Task Assignees RLS: team members can unassign", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "assignees-delete-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Admin assigns member
    await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.member.user.id });

    // Member can unassign themselves
    const { error } = await ctx.member.client
      .from("task_assignees")
      .delete()
      .eq("task_id", task.id)
      .eq("user_id", ctx.member.user.id);
    assert.equal(error, null, "Member should be able to unassign themselves");

    // Verify
    const { data: verify } = await ctx.admin.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    assert.equal(verify.length, 0, "Assignment should be removed");
  });

  test("Task Assignees RLS: duplicate assignment prevention", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      labelPrefix: "assignees-dup-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // First assignment
    const { error: err1 } = await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.admin.user.id });
    assert.equal(err1, null, "First assignment should succeed");

    // Duplicate assignment should fail
    const { error: err2 } = await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.admin.user.id });
    assert.ok(err2, "Duplicate assignment should fail");
  });

  test("Task Assignees RLS: multiple assignees per task", async (t) => {
    const ctx = await createTeamWithUsers(serviceClient, {
      includesMember: true,
      labelPrefix: "assignees-multi-",
    });
    const projectId = await createProject(ctx.admin.client, ctx.teamId);
    const task = await createTask(ctx.admin.client, projectId, ctx.admin.user.id);
    ctx.projectId = projectId;
    ctx.taskId = task.id;
    
    t.after(() => cleanup(serviceClient, ctx));

    // Assign both admin and member
    await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.admin.user.id });
    await ctx.admin.client
      .from("task_assignees")
      .insert({ task_id: task.id, user_id: ctx.member.user.id });

    // Verify both are assigned
    const { data: assignees } = await ctx.admin.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    assert.equal(assignees.length, 2, "Both users should be assigned");
  });

  test("Task Assignees RLS: cross-team isolation", async (t) => {
    const team1 = await createTeamWithUsers(serviceClient, { labelPrefix: "assignees-iso1-" });
    const team2 = await createTeamWithUsers(serviceClient, { labelPrefix: "assignees-iso2-" });
    
    const project1 = await createProject(team1.admin.client, team1.teamId);
    const task1 = await createTask(team1.admin.client, project1, team1.admin.user.id);
    team1.projectId = project1;
    team1.taskId = task1.id;

    t.after(async () => {
      await cleanup(serviceClient, team1);
      await cleanup(serviceClient, team2);
    });

    // Team1 admin assigns themselves
    await team1.admin.client
      .from("task_assignees")
      .insert({ task_id: task1.id, user_id: team1.admin.user.id });

    // Team2 admin cannot see Team1's assignees
    const { data: team2View } = await team2.admin.client
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task1.id);
    assert.equal(team2View.length, 0, "Team2 should not see Team1's assignees");

    // Team2 admin cannot assign to Team1's task
    const { error: crossTeamErr } = await team2.admin.client
      .from("task_assignees")
      .insert({ task_id: task1.id, user_id: team2.admin.user.id });
    assert.ok(crossTeamErr, "Team2 should not be able to assign to Team1's task");
  });
}
