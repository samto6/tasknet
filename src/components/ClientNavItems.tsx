"use client";

import dynamic from "next/dynamic";
import { User } from "@supabase/supabase-js";

// Dynamically import heavy client components to reduce initial bundle
const MobileMenu = dynamic(() => import("./MobileMenu"), {
  ssr: false,
  loading: () => (
    <div className="md:hidden w-10 h-10" /> // Placeholder to prevent layout shift
  ),
});

const NotificationBell = dynamic(() => import("./NotificationBell"), {
  ssr: false,
  loading: () => (
    <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
  ),
});

export function ClientNotificationBell() {
  return <NotificationBell />;
}

export function ClientMobileMenu({ user }: { user: User }) {
  return <MobileMenu user={user} />;
}
