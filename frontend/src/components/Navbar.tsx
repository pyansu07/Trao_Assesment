"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Logo } from "./Logo";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initial}
              </span>
              <span className="text-sm text-slate-500">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-xs">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
