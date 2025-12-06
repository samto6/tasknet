/**
 * RLS Tests for User Preferences Table
 * Tests: preferences privacy, CRUD operations, and user isolation
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
  test("User Prefs RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("User Prefs RLS: users can create and read their own preferences", async (t) => {
    const user = await createAuthedClient(serviceClient, "prefs-crud");

    t.after(async () => {
      await serviceClient.from("user_prefs").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create preferences
    const { error: createErr } = await user.client
      .from("user_prefs")
      .insert({
        user_id: user.user.id,
        email_mentions: true,
        email_due: true,
        email_digest: false,
      });
    assert.equal(createErr, null, "User should be able to create preferences");

    // Read preferences
    const { data: prefs, error: readErr } = await user.client
      .from("user_prefs")
      .select("*")
      .eq("user_id", user.user.id)
      .single();
    assert.equal(readErr, null, "User should be able to read preferences");
    assert.equal(prefs.email_mentions, true);
    assert.equal(prefs.email_due, true);
    assert.equal(prefs.email_digest, false);
  });

  test("User Prefs RLS: users can update their own preferences", async (t) => {
    const user = await createAuthedClient(serviceClient, "prefs-update");

    t.after(async () => {
      await serviceClient.from("user_prefs").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create initial preferences
    await user.client
      .from("user_prefs")
      .insert({ user_id: user.user.id, email_mentions: true, email_due: true, email_digest: true });

    // Update preferences
    const { error: updateErr } = await user.client
      .from("user_prefs")
      .update({ email_digest: false, email_mentions: false })
      .eq("user_id", user.user.id);
    assert.equal(updateErr, null, "User should be able to update preferences");

    // Verify update
    const { data: updated } = await user.client
      .from("user_prefs")
      .select("email_digest, email_mentions")
      .eq("user_id", user.user.id)
      .single();
    assert.equal(updated.email_digest, false);
    assert.equal(updated.email_mentions, false);
  });

  test("User Prefs RLS: users cannot see other users' preferences", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "prefs-iso1");
    const user2 = await createAuthedClient(serviceClient, "prefs-iso2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("user_prefs").delete().eq("user_id", user1.user.id),
        serviceClient.from("user_prefs").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // Both users create preferences
    await user1.client
      .from("user_prefs")
      .insert({ user_id: user1.user.id, email_mentions: true, email_due: true, email_digest: true });
    await user2.client
      .from("user_prefs")
      .insert({ user_id: user2.user.id, email_mentions: false, email_due: false, email_digest: false });

    // User1 can only see their own prefs
    const { data: user1Prefs } = await user1.client
      .from("user_prefs")
      .select("user_id");
    assert.equal(user1Prefs.length, 1, "User1 should only see 1 preference row");
    assert.equal(user1Prefs[0].user_id, user1.user.id);

    // User2 can only see their own prefs
    const { data: user2Prefs } = await user2.client
      .from("user_prefs")
      .select("user_id");
    assert.equal(user2Prefs.length, 1, "User2 should only see 1 preference row");
    assert.equal(user2Prefs[0].user_id, user2.user.id);
  });

  test("User Prefs RLS: users cannot create preferences for others", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "prefs-impersonate1");
    const user2 = await createAuthedClient(serviceClient, "prefs-impersonate2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("user_prefs").delete().eq("user_id", user1.user.id),
        serviceClient.from("user_prefs").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 tries to create preferences for User2
    const { error } = await user1.client
      .from("user_prefs")
      .insert({
        user_id: user2.user.id,
        email_mentions: false,
        email_due: false,
        email_digest: false,
      });
    assert.ok(error, "User should not be able to create preferences for another user");
  });

  test("User Prefs RLS: users cannot update others' preferences", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "prefs-cross-update1");
    const user2 = await createAuthedClient(serviceClient, "prefs-cross-update2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("user_prefs").delete().eq("user_id", user1.user.id),
        serviceClient.from("user_prefs").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 creates preferences
    await user1.client
      .from("user_prefs")
      .insert({ user_id: user1.user.id, email_mentions: true, email_due: true, email_digest: true });

    // User2 tries to update User1's preferences
    await user2.client
      .from("user_prefs")
      .update({ email_mentions: false })
      .eq("user_id", user1.user.id);

    // Verify unchanged
    const { data: verify } = await user1.client
      .from("user_prefs")
      .select("email_mentions")
      .eq("user_id", user1.user.id)
      .single();
    assert.equal(verify.email_mentions, true, "Preferences should remain unchanged");
  });

  test("User Prefs RLS: upsert with onConflict works correctly", async (t) => {
    const user = await createAuthedClient(serviceClient, "prefs-upsert");

    t.after(async () => {
      await serviceClient.from("user_prefs").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // First upsert (insert)
    const { error: err1 } = await user.client
      .from("user_prefs")
      .upsert(
        { user_id: user.user.id, email_mentions: true, email_due: true, email_digest: true },
        { onConflict: "user_id" }
      );
    assert.equal(err1, null, "First upsert should succeed");

    // Second upsert (update)
    const { error: err2 } = await user.client
      .from("user_prefs")
      .upsert(
        { user_id: user.user.id, email_mentions: false, email_due: false, email_digest: false },
        { onConflict: "user_id" }
      );
    assert.equal(err2, null, "Second upsert should succeed");

    // Verify final state
    const { data: final } = await user.client
      .from("user_prefs")
      .select("*")
      .eq("user_id", user.user.id)
      .single();
    assert.equal(final.email_mentions, false);
    assert.equal(final.email_due, false);
    assert.equal(final.email_digest, false);
  });

  test("User Prefs RLS: default values are applied", async (t) => {
    const user = await createAuthedClient(serviceClient, "prefs-defaults");

    t.after(async () => {
      await serviceClient.from("user_prefs").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Insert with only user_id (relying on defaults)
    const { error } = await user.client
      .from("user_prefs")
      .insert({ user_id: user.user.id });
    assert.equal(error, null, "Insert with defaults should succeed");

    // Verify defaults
    const { data: prefs } = await user.client
      .from("user_prefs")
      .select("*")
      .eq("user_id", user.user.id)
      .single();
    
    // Based on schema: email_mentions, email_due, email_digest all default to true
    assert.equal(prefs.email_mentions, true, "email_mentions should default to true");
    assert.equal(prefs.email_due, true, "email_due should default to true");
    assert.equal(prefs.email_digest, true, "email_digest should default to true");
  });
}
