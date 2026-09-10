"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="text-sm font-semibold text-slate-900">
          AI Interview Prep Kit
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <button onClick={handleLogout} className="btn-secondary text-xs">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
