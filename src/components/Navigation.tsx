import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import Button from "./ui/Button";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";

export default async function Navigation() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 bg-background border-b-2 border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="text-2xl font-bold tracking-tight">
              <span className="text-sage-green">Task</span>
              <span className="text-foreground">Net</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/teams"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Teams
                </Link>
                <Link
                  href="/timeline"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Timeline
                </Link>
                <Link
                  href="/wellness"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Wellness
                </Link>
                <Link
                  href="/settings"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Settings
                </Link>

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Menu */}
                <div className="flex items-center gap-3 pl-3 border-l-2 border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sage-green/20 border-2 border-sage-green/40 flex items-center justify-center text-sm font-semibold text-sage-green">
                      {user.email?.[0].toUpperCase() || "U"}
                    </div>
                    <span className="text-sm text-muted">{user.email?.split("@")[0]}</span>
                  </div>
                  <form action="/auth/signout" method="post">
                    <Button type="submit" variant="ghost" size="sm">
                      Sign out
                    </Button>
                  </form>
                </div>
              </div>

              {/* Mobile Menu */}
              <MobileMenu user={user} />
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
