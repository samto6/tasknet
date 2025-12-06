/**
 * RLS Tests for Notifications Table
 * Tests: notification privacy, creation, updates, and user isolation
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingEnv,
  createServiceClient,
  createAuthedClient,
  cleanup,
} from "./_testUtils.mjs";

const missingEnv = getMissingEnv();

if (missingEnv.length) {
  test("Notifications RLS tests skipped (missing Supabase env)", { skip: true }, () => {});
  console.warn(
    "Skipping Supabase RLS tests. Missing env vars:",
    missingEnv.map(([key]) => key).join(", ")
  );
} else {
  const serviceClient = createServiceClient();

  test("Notifications RLS: users can only see their own notifications", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "notif-user1");
    const user2 = await createAuthedClient(serviceClient, "notif-user2");
    let notif1Id, notif2Id;

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("notifications").delete().eq("user_id", user1.user.id),
        serviceClient.from("notifications").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 creates a notification
    const { data: notif1, error: err1 } = await user1.client
      .from("notifications")
      .insert({ user_id: user1.user.id, kind: "test", payload_json: { message: "Hello" } })
      .select("id")
      .single();
    assert.equal(err1, null, "User1 should create notification");
    notif1Id = notif1.id;

    // User2 creates a notification
    const { data: notif2, error: err2 } = await user2.client
      .from("notifications")
      .insert({ user_id: user2.user.id, kind: "test", payload_json: { message: "World" } })
      .select("id")
      .single();
    assert.equal(err2, null, "User2 should create notification");
    notif2Id = notif2.id;

    // User1 can only see their notification
    const { data: user1Notifs } = await user1.client
      .from("notifications")
      .select("id, kind");
    assert.equal(user1Notifs.length, 1, "User1 should only see 1 notification");
    assert.equal(user1Notifs[0].id, notif1Id);

    // User2 can only see their notification
    const { data: user2Notifs } = await user2.client
      .from("notifications")
      .select("id, kind");
    assert.equal(user2Notifs.length, 1, "User2 should only see 1 notification");
    assert.equal(user2Notifs[0].id, notif2Id);

    // User1 cannot see User2's notification by ID
    const { data: crossView } = await user1.client
      .from("notifications")
      .select("id")
      .eq("id", notif2Id);
    assert.equal(crossView.length, 0, "User1 should not see User2's notification");
  });

  test("Notifications RLS: users can update their own notifications (mark as read)", async (t) => {
    const user = await createAuthedClient(serviceClient, "notif-update");

    t.after(async () => {
      await serviceClient.from("notifications").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create notification
    const { data: notif } = await user.client
      .from("notifications")
      .insert({ user_id: user.user.id, kind: "reminder", payload_json: {} })
      .select("id, read_at")
      .single();
    assert.equal(notif.read_at, null, "Notification should start unread");

    // Mark as read
    const readTime = new Date().toISOString();
    const { error: updateErr } = await user.client
      .from("notifications")
      .update({ read_at: readTime })
      .eq("id", notif.id);
    assert.equal(updateErr, null, "User should be able to mark notification as read");

    // Verify
    const { data: updated } = await user.client
      .from("notifications")
      .select("read_at")
      .eq("id", notif.id)
      .single();
    assert.ok(updated.read_at, "Notification should be marked as read");
  });

  test("Notifications RLS: users cannot create notifications for others", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "notif-impersonate1");
    const user2 = await createAuthedClient(serviceClient, "notif-impersonate2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("notifications").delete().eq("user_id", user1.user.id),
        serviceClient.from("notifications").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 tries to create a notification for User2
    const { error } = await user1.client
      .from("notifications")
      .insert({ user_id: user2.user.id, kind: "malicious", payload_json: {} });
    
    assert.ok(error, "User should not be able to create notifications for another user");
  });

  test("Notifications RLS: users cannot update others' notifications", async (t) => {
    const user1 = await createAuthedClient(serviceClient, "notif-cross-update1");
    const user2 = await createAuthedClient(serviceClient, "notif-cross-update2");

    t.after(async () => {
      await Promise.allSettled([
        serviceClient.from("notifications").delete().eq("user_id", user1.user.id),
        serviceClient.from("notifications").delete().eq("user_id", user2.user.id),
        serviceClient.auth.admin.deleteUser(user1.user.id),
        serviceClient.auth.admin.deleteUser(user2.user.id),
      ]);
    });

    // User1 creates notification
    const { data: notif } = await user1.client
      .from("notifications")
      .insert({ user_id: user1.user.id, kind: "test", payload_json: {} })
      .select("id")
      .single();

    // User2 tries to mark User1's notification as read
    await user2.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notif.id);

    // Verify it's still unread
    const { data: verify } = await user1.client
      .from("notifications")
      .select("read_at")
      .eq("id", notif.id)
      .single();
    assert.equal(verify.read_at, null, "Notification should still be unread");
  });

  test("Notifications RLS: users can delete their own notifications", async (t) => {
    const user = await createAuthedClient(serviceClient, "notif-delete");

    t.after(async () => {
      await serviceClient.from("notifications").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    // Create notification
    const { data: notif } = await user.client
      .from("notifications")
      .insert({ user_id: user.user.id, kind: "test", payload_json: {} })
      .select("id")
      .single();

    // Delete notification
    const { error: deleteErr } = await user.client
      .from("notifications")
      .delete()
      .eq("id", notif.id);
    assert.equal(deleteErr, null, "User should be able to delete their notification");

    // Verify deleted
    const { data: verify } = await user.client
      .from("notifications")
      .select("id")
      .eq("id", notif.id);
    assert.equal(verify.length, 0, "Notification should be deleted");
  });

  test("Notifications RLS: various notification kinds are supported", async (t) => {
    const user = await createAuthedClient(serviceClient, "notif-kinds");

    t.after(async () => {
      await serviceClient.from("notifications").delete().eq("user_id", user.user.id);
      await serviceClient.auth.admin.deleteUser(user.user.id);
    });

    const kinds = ["mention", "due_reminder", "team_invite", "badge_unlock", "streak"];
    
    for (const kind of kinds) {
      const { error } = await user.client
        .from("notifications")
        .insert({ user_id: user.user.id, kind, payload_json: { test: kind } });
      assert.equal(error, null, `Should be able to create '${kind}' notification`);
    }

    const { data: allNotifs } = await user.client
      .from("notifications")
      .select("kind");
    assert.equal(allNotifs.length, kinds.length, "All notification kinds should be created");
  });
}
