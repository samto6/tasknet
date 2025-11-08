import { getUserSettings, getUserStats } from "@/server-actions/settings";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import ProfileForm from "./ProfileForm";
import EmailPreferencesForm from "./EmailPreferencesForm";
import Badge from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";

export default async function SettingsPage() {
  const settings = await getUserSettings();
  const stats = await getUserStats();

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Settings</h1>
          <p className="text-muted">Manage your profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardTitle className="mb-2">Profile</CardTitle>
              <CardDescription className="mb-6">
                Update your personal information
              </CardDescription>
              <ProfileForm name={settings.name || ""} email={settings.email || ""} />
            </Card>

            {/* Email Preferences */}
            <Card>
              <CardTitle className="mb-2">Email Notifications</CardTitle>
              <CardDescription className="mb-6">
                Choose which emails you want to receive
              </CardDescription>
              <EmailPreferencesForm
                emailMentions={settings.emailMentions}
                emailDue={settings.emailDue}
                emailDigest={settings.emailDigest}
              />
            </Card>

            {/* Account Info */}
            <Card>
              <CardTitle className="mb-2">Account Information</CardTitle>
              <CardDescription className="mb-6">
                Your account details
              </CardDescription>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">Email Address</span>
                  <span className="font-mono">{settings.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">User ID</span>
                  <span className="font-mono text-xs">
                    {settings.id.slice(0, 12)}...
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Overview Stats */}
            <Card>
              <CardTitle className="mb-4">Your Stats</CardTitle>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted mb-1">Teams</div>
                  <div className="text-2xl font-bold">{stats.teamCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted mb-1">Tasks Completed</div>
                  <div className="text-2xl font-bold">{stats.completedTasks}</div>
                </div>
                <div>
                  <div className="text-sm text-muted mb-1">Current Streak</div>
                  <div className="text-2xl font-bold">
                    {stats.currentStreak} 🔥
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted mb-1">Longest Streak</div>
                  <div className="text-2xl font-bold">{stats.longestStreak}</div>
                </div>
                <div>
                  <div className="text-sm text-muted mb-1">Check-ins</div>
                  <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                </div>
              </div>
            </Card>

            {/* Badges */}
            {stats.badges.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Badges</CardTitle>
                <div className="space-y-2">
                  {stats.badges.map((badge) => (
                    <div
                      key={badge.badge_name}
                      className="p-3 bg-background rounded-[6px] border-2 border-border"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="default">{badge.badge_name}</Badge>
                        <span className="text-xs text-muted">
                          {formatDistanceToNow(new Date(badge.unlocked_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
