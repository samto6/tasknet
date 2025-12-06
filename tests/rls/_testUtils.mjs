/**
 * Shared test utilities for Supabase RLS tests
 * Provides common functionality for creating test users, teams, and cleanup
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

export const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limiting helper - delay between auth operations
const RATE_LIMIT_DELAY_MS = 500;

/**
 * Check if Supabase environment variables are available
 */
export function getMissingEnv() {
  return [
    ["SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value);
}

/**
 * Create a service client with admin privileges
 */
export function createServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      if (err.message?.includes("rate limit")) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Create an authenticated client for a test user
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient
 * @param {string} label - Label for the test user
 * @returns {Promise<{client: import('@supabase/supabase-js').SupabaseClient, user: any, session: any}>}
 */
export async function createAuthedClient(serviceClient, label) {
  // Add delay to avoid rate limits
  await sleep(RATE_LIMIT_DELAY_MS);
  
  const email = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
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
  
  // Retry sign-in in case of rate limit
  const signedIn = await withRetry(async () => {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Failed to sign in user: ${error.message}`);
    return data;
  });
  
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

/**
 * Create a team with admin and optional member/outsider users
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient
 * @param {object} options
 * @returns {Promise<{admin: any, member?: any, outsider?: any, teamId: string, inviteCode: string}>}
 */
export async function createTeamWithUsers(serviceClient, options = {}) {
  const { includesMember = false, includesOutsider = false, labelPrefix = "" } = options;
  
  const admin = await createAuthedClient(serviceClient, `${labelPrefix}admin`);
  const member = includesMember ? await createAuthedClient(serviceClient, `${labelPrefix}member`) : null;
  const outsider = includesOutsider ? await createAuthedClient(serviceClient, `${labelPrefix}outsider`) : null;
  const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10);

  // Create team
  const { data: team, error: teamErr } = await serviceClient
    .from("teams")
    .insert({ name: `Test Team ${Date.now()}`, invite_code: inviteCode })
    .select("id")
    .single();
  if (teamErr) throw new Error(`Team insert failed: ${teamErr.message}`);

  // Add admin membership
  await serviceClient.from("memberships").upsert(
    { user_id: admin.user.id, team_id: team.id, role: "admin" },
    { onConflict: "user_id,team_id" }
  );

  // Add member membership if included
  if (member) {
    await serviceClient.from("memberships").upsert(
      { user_id: member.user.id, team_id: team.id, role: "member" },
      { onConflict: "user_id,team_id" }
    );
  }

  return { admin, member, outsider, teamId: team.id, inviteCode };
}

/**
 * Create a project for a team
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 * @param {string} teamId
 * @returns {Promise<string>} Project ID
 */
export async function createProject(adminClient, teamId) {
  const { data: project, error: projectErr } = await adminClient
    .from("projects")
    .insert({ team_id: teamId, name: `Test Project ${Date.now()}` })
    .select("id")
    .single();
  if (projectErr) throw new Error(`Project insert failed: ${projectErr.message}`);
  return project.id;
}

/**
 * Create a task in a project
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} projectId
 * @param {string} createdBy
 * @returns {Promise<{id: string, status: string}>}
 */
export async function createTask(client, projectId, createdBy) {
  const { data: task, error: taskErr } = await client
    .from("tasks")
    .insert({
      project_id: projectId,
      title: `Test Task ${Date.now()}`,
      created_by: createdBy,
    })
    .select("id, status")
    .single();
  if (taskErr) throw new Error(`Task insert failed: ${taskErr.message}`);
  return task;
}

/**
 * Clean up test data
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient
 * @param {object} ctx - Context with resources to clean up
 */
export async function cleanup(serviceClient, ctx) {
  const deletions = [];
  
  // Delete in order to respect foreign key constraints
  if (ctx.taskId) {
    deletions.push(serviceClient.from("task_comments").delete().eq("task_id", ctx.taskId));
    deletions.push(serviceClient.from("task_assignees").delete().eq("task_id", ctx.taskId));
    deletions.push(serviceClient.from("tasks").delete().eq("id", ctx.taskId));
  }
  if (ctx.projectId) {
    deletions.push(serviceClient.from("milestones").delete().eq("project_id", ctx.projectId));
    deletions.push(serviceClient.from("tasks").delete().eq("project_id", ctx.projectId));
    deletions.push(serviceClient.from("projects").delete().eq("id", ctx.projectId));
  }
  if (ctx.teamId) {
    deletions.push(serviceClient.from("memberships").delete().eq("team_id", ctx.teamId));
    deletions.push(serviceClient.from("team_invites").delete().eq("team_id", ctx.teamId));
    deletions.push(serviceClient.from("teams").delete().eq("id", ctx.teamId));
  }
  
  await Promise.allSettled(deletions);
  
  // Clean up users
  const userDeletions = [];
  if (ctx.admin?.user?.id) userDeletions.push(serviceClient.auth.admin.deleteUser(ctx.admin.user.id));
  if (ctx.member?.user?.id) userDeletions.push(serviceClient.auth.admin.deleteUser(ctx.member.user.id));
  if (ctx.outsider?.user?.id) userDeletions.push(serviceClient.auth.admin.deleteUser(ctx.outsider.user.id));
  
  await Promise.allSettled(userDeletions);
}

/**
 * Generate a unique identifier for test isolation
 */
export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
