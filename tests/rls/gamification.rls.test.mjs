/**
 * RLS Tests for Streaks and Rewards (Gamification)
 * Tests: streak privacy, reward earning, and user isolation
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createAuthedClient,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Gamification RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  // ============= STREAKS TESTS =============

  test("Streaks RLS: users can create and read their own streaks", async (t) => {
    const user = await createAuthedClient(serviceClient, "streak-crud");

    t.after(async () => {
      await serviceClient.from("streaks").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create streak
    const { error: createErr } = await user.client
      .from("streaks")
      .insert({ user_id: user.user.id, current_days: 5, longest_days: 10 });
    assert.equal(createErr, null, "User should create streak");

    // Read streak
    const { data: streak, error: readErr } = await user.client
      .from("streaks")
      .select("current_days, longest_days")
      .eq("user_id", user.user.id)
      .single();
    assert.equal(readErr, null, "User should read streak");
    assert.equal(streak.current_days, 5);
    assert.equal(streak.longest_days, 10);
  });

  test("Streaks RLS: users can update their own streaks", async (t) => {
    const user = await createAuthedClient(serviceClient, "streak-update");

    t.after(async () => {
      await serviceClient.from("streaks").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create initial streak
    await user.client
      .from("streaks")
      .insert({ user_id: user.user.id, current_days: 1, longest_days: 1 });

    // Update streak
    const { error: updateErr } = await user.client
      .from("streaks")
      .update({ current_days: 7, longest_days: 7 })
      .eq("user_id", user.user.id);
    assert.equal(updateErr, null, "User should update streak");

    // Verify
    const { data: updated } = await user.client
      .from("streaks")
      .select("current_days, longest_days")
      .eq("user_id", user.user.id)
      .single();
    assert.equal(updated.current_days, 7);
    assert.equal(updated.longest_days, 7);
  });

  test("Streaks RLS: users cannot see other users' streaks", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "streak-iso1");
    const user2 = await createAuthedClient(serviceClient, "streak-iso2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("streaks").delete().eq("user_id", user1.user.id),
        serviceClient.from("streaks").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // Both users create streaks
    await user1.client
      .from("streaks")
      .insert({ user_id: user1.user.id, current_days: 100, longest_days: 100 });
    await user2.client
      .from("streaks")
      .insert({ user_id: user2.user.id, current_days: 5, longest_days: 5 });

    // User1 can only see their streak
    const { data: user1Streaks } = await user1.client
      .from("streaks")
      .select("user_id, current_days");
    assert.equal(user1Streaks.length, 1);
    assert.equal(user1Streaks[0].user_id, user1.user.id);

    // User2 cannot see User1's streak
    const { data: user2Streaks } = await user2.client
      .from("streaks")
      .select("user_id, current_days");
    assert.equal(user2Streaks.length, 1);
    assert.equal(user2Streaks[0].user_id, user2.user.id);
  });

  test("Streaks RLS: users cannot create streaks for others", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "streak-impersonate1");
    const user2 = await createAuthedClient(serviceClient, "streak-impersonate2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("streaks").delete().eq("user_id", user1.user.id),
        serviceClient.from("streaks").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 tries to create streak for User2
    const { error } = await user1.client
      .from("streaks")
      .insert({ user_id: user2.user.id, current_days: 999, longest_days: 999 });
    assert.ok(error, "User should not create streak for another user");
  });

  // ============= REWARDS TESTS =============

  test("Rewards RLS: users can earn and read their own rewards", async (t) => {
    const user = await createAuthedClient(serviceClient, "reward-crud");

    t.after(async () => {
      await serviceClient.from("rewards").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Earn a reward
    const { error: createErr } = await user.client
      .from("rewards")
      .insert({ user_id: user.user.id, kind: "first_checkin" });
    assert.equal(createErr, null, "User should earn reward");

    // Read rewards
    const { data: rewards, error: readErr } = await user.client
      .from("rewards")
      .select("kind, awarded_at")
      .eq("user_id", user.user.id);
    assert.equal(readErr, null, "User should read rewards");
    assert.equal(rewards.length, 1);
    assert.equal(rewards[0].kind, "first_checkin");
  });

  test("Rewards RLS: reward kinds are unique per user", async (t) => {
    const user = await createAuthedClient(serviceClient, "reward-unique");

    t.after(async () => {
      await serviceClient.from("rewards").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // First reward
    const { error: err1 } = await user.client
      .from("rewards")
      .insert({ user_id: user.user.id, kind: "streak_7" });
    assert.equal(err1, null, "First reward should succeed");

    // Duplicate reward should fail
    const { error: err2 } = await user.client
      .from("rewards")
      .insert({ user_id: user.user.id, kind: "streak_7" });
    assert.ok(err2, "Duplicate reward kind should fail");
  });

  test("Rewards RLS: users cannot see other users' rewards", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "reward-iso1");
    const user2 = await createAuthedClient(serviceClient, "reward-iso2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("rewards").delete().eq("user_id", user1.user.id),
        serviceClient.from("rewards").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // Both users earn rewards
    await user1.client
      .from("rewards")
      .insert({ user_id: user1.user.id, kind: "early_adopter" });
    await user2.client
      .from("rewards")
      .insert({ user_id: user2.user.id, kind: "task_master" });

    // User1 can only see their rewards
    const { data: user1Rewards } = await user1.client
      .from("rewards")
      .select("user_id, kind");
    assert.equal(user1Rewards.length, 1);
    assert.equal(user1Rewards[0].kind, "early_adopter");

    // User2 can only see their rewards
    const { data: user2Rewards } = await user2.client
      .from("rewards")
      .select("user_id, kind");
    assert.equal(user2Rewards.length, 1);
    assert.equal(user2Rewards[0].kind, "task_master");
  });

  test("Rewards RLS: users cannot create rewards for others", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "reward-impersonate1");
    const user2 = await createAuthedClient(serviceClient, "reward-impersonate2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("rewards").delete().eq("user_id", user1.user.id),
        serviceClient.from("rewards").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 tries to grant reward to User2
    const { error } = await user1.client
      .from("rewards")
      .insert({ user_id: user2.user.id, kind: "hacked_badge" });
    assert.ok(error, "User should not create reward for another user");
  });

  test("Rewards RLS: multiple reward kinds can be earned", async (t) => {
    const user = await createAuthedClient(serviceClient, "reward-multi");

    t.after(async () => {
      await serviceClient.from("rewards").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    const rewardKinds = ["streak_7", "streak_30", "first_task", "team_player", "early_bird"];
    
    for (const kind of rewardKinds) {
      const { error } = await user.client
        .from("rewards")
        .insert({ user_id: user.user.id, kind });
      assert.equal(error, null, `Should earn '${kind}' reward`);
    }

    const { data: allRewards } = await user.client
      .from("rewards")
      .select("kind");
    assert.equal(allRewards.length, rewardKinds.length, "All rewards should be earned");
  });
}
