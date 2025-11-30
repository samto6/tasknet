import { getNotifications } from "@/server-actions/notifications";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import NotificationList from "./NotificationList";

export default async function NotificationsPage() {
  const notifications = await getNotifications(50, 0);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Notifications</h1>
          <p className="text-muted">Stay updated on your tasks and reminders</p>
        </div>

        {/* Notifications Card */}
        <Card>
          <CardTitle className="mb-2">All Notifications</CardTitle>
          <CardDescription className="mb-6">
            Click on a notification to view details
          </CardDescription>

          <NotificationList initialNotifications={notifications} />
        </Card>
      </div>
    </main>
  );
}
