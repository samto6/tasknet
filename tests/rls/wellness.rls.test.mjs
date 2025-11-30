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
  test("Wellness RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
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

  test("Checkins RLS: users can only see their own check-ins", async (t) => {
    const user1 = await createAuthedClient("wellness-user1");
    const user2 = await createAuthedClient("wellness-user2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("checkins").delete().eq("user_id", user1.user.id),
        serviceClient.from("checkins").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 creates a check-in
    const { data: checkin1, error: err1 } = await user1.client
      .from("checkins")
      .insert({ user_id: user1.user.id, mood: 4, note_private: "Feeling good" })
      .select("id, mood")
      .single();
    assert.equal(err1, null, "User1 should be able to create check-in");
    assert.equal(checkin1.mood, 4);

    // User2 creates a check-in
    const { data: checkin2, error: err2 } = await user2.client
      .from("checkins")
      .insert({ user_id: user2.user.id, mood: 3, note_private: "Okay day" })
      .select("id, mood")
      .single();
    assert.equal(err2, null, "User2 should be able to create check-in");

    // User1 can only see their own check-ins
    const { data: user1Checkins } = await user1.client
      .from("checkins")
      .select("id, user_id");
    assert.equal(user1Checkins.length, 1, "User1 should only see their own check-in");
    assert.equal(user1Checkins[0].user_id, user1.user.id);

    // User2 cannot see User1's check-ins
    const { data: user2Checkins } = await user2.client
      .from("checkins")
      .select("id, user_id");
    assert.equal(user2Checkins.length, 1, "User2 should only see their own check-in");
    assert.equal(user2Checkins[0].user_id, user2.user.id);
  });

  test("Streaks RLS: users can only see their own streaks", async (t) => {
    const user1 = await createAuthedClient("streak-user1");
    const user2 = await createAuthedClient("streak-user2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("streaks").delete().eq("user_id", user1.user.id),
        serviceClient.from("streaks").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // Create streaks for both users
    const { error: streak1Err } = await user1.client
      .from("streaks")
      .insert({ user_id: user1.user.id, current_days: 5, longest_days: 10 });
    assert.equal(streak1Err, null, "User1 should be able to create streak");

    const { error: streak2Err } = await user2.client
      .from("streaks")
      .insert({ user_id: user2.user.id, current_days: 3, longest_days: 7 });
    assert.equal(streak2Err, null, "User2 should be able to create streak");

    // User1 can only see their own streak
    const { data: user1Streaks } = await user1.client
      .from("streaks")
      .select("user_id, current_days");
    assert.equal(user1Streaks.length, 1);
    assert.equal(user1Streaks[0].current_days, 5);

    // User2 can only see their own streak
    const { data: user2Streaks } = await user2.client
      .from("streaks")
      .select("user_id, current_days");
    assert.equal(user2Streaks.length, 1);
    assert.equal(user2Streaks[0].current_days, 3);
  });

  test("Rewards RLS: users can only see their own badges", async (t) => {
    const user1 = await createAuthedClient("badge-user1");
    const user2 = await createAuthedClient("badge-user2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("rewards").delete().eq("user_id", user1.user.id),
        serviceClient.from("rewards").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // Award badges to users
    const { error: badge1Err } = await user1.client
      .from("rewards")
      .insert({ user_id: user1.user.id, kind: "streak_7" });
    assert.equal(badge1Err, null, "User1 should be able to receive badge");

    const { error: badge2Err } = await user2.client
      .from("rewards")
      .insert({ user_id: user2.user.id, kind: "streak_30" });
    assert.equal(badge2Err, null, "User2 should be able to receive badge");

    // User1 can only see their own badges
    const { data: user1Badges } = await user1.client
      .from("rewards")
      .select("kind");
    assert.equal(user1Badges.length, 1);
    assert.equal(user1Badges[0].kind, "streak_7");

    // User2 can only see their own badges
    const { data: user2Badges } = await user2.client
      .from("rewards")
      .select("kind");
    assert.equal(user2Badges.length, 1);
    assert.equal(user2Badges[0].kind, "streak_30");
  });

  test("Rewards RLS: duplicate badges are rejected", async (t) => {
    const user = await createAuthedClient("badge-dupe");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("rewards").delete().eq("user_id", user.user.id),
        serviceClient.auth.admin.deleteUser(user.user.id),
      ]);
    });

    // First badge insert succeeds
    const { error: firstErr } = await user.client
      .from("rewards")
      .insert({ user_id: user.user.id, kind: "on_time_10" });
    assert.equal(firstErr, null);

    // Duplicate badge insert should fail (unique constraint)
    const { error: dupeErr } = await user.client
      .from("rewards")
      .insert({ user_id: user.user.id, kind: "on_time_10" });
    assert.ok(dupeErr, "Duplicate badge should be rejected");
  });
}
