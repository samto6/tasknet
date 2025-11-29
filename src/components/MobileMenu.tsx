"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import Button from "./ui/Button";

interface MobileMenuProps {
  user: User | null;
}

export default function MobileMenu({ user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  if (!user) return null;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="md:hidden flex flex-col gap-1.5 w-10 h-10 items-center justify-center hover:bg-surface rounded-lg transition-colors"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span
          className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${
            isOpen ? "rotate-45 translate-y-2" : ""
          }`}
        />
        <span
          className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${
            isOpen ? "-rotate-45 -translate-y-2" : ""
          }`}
        />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-background border-l-2 border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-border">
            <div className="text-xl font-bold">
              <span className="text-sage-green">Task</span>
              <span className="text-foreground">Net</span>
            </div>
            <button
              onClick={closeMenu}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="flex flex-col gap-2 px-4">
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Dashboard
              </Link>
              <Link
                href="/teams"
                onClick={closeMenu}
                className="px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Teams
              </Link>
              <Link
                href="/timeline"
                onClick={closeMenu}
                className="px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Timeline
              </Link>
              <Link
                href="/wellness"
                onClick={closeMenu}
                className="px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Wellness
              </Link>
              <Link
                href="/settings"
                onClick={closeMenu}
                className="px-4 py-3 text-base font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Settings
              </Link>
            </div>
          </nav>

          {/* User Info & Sign Out */}
          <div className="border-t-2 border-border p-4">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-sage-green/20 border-2 border-sage-green/40 flex items-center justify-center text-sm font-semibold text-sage-green">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.email?.split("@")[0]}
                </div>
                <div className="text-xs text-muted truncate">{user.email}</div>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="md" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
