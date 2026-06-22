"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/onboarding", label: "Profile", icon: "👤" },
  { href: "/wardrobe", label: "Wardrobe", icon: "👔" },
  { href: "/compare", label: "Try-On", icon: "🪞" },
  { href: "/history", label: "History", icon: "📊" },
];

export function Navbar() {
  const { data } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-lg tracking-tight text-accent">
          <span className="text-2xl">✨</span>
          StyleSense AI
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {data?.user &&
            links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-accent/10 text-accent font-semibold"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <span className="mr-1">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {data?.user ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-neutral-500 truncate max-w-[160px]">
                {data.user.name || data.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent/90"
            >
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          {data?.user && (
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && data?.user && (
        <div className="md:hidden border-t border-black/5 dark:border-white/5 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold hover:bg-black/5 dark:border-white/10 text-left dark:hover:bg-white/5 mt-2"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
