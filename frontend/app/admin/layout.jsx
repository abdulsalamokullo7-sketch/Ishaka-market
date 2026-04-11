"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginRedirectUrl, syncAuthSession } from "../../utils/api";

/**
 * Avoids mounting admin pages (and their /admin/* API calls) until the session
 * is confirmed as admin — prevents 403 noise and matches backend requireRole("admin").
 */
export default function AdminLayout({ children }) {
  const router = useRouter();
  const [gate, setGate] = useState("loading");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace(loginRedirectUrl("/admin"));
      return;
    }
    syncAuthSession()
      .then((u) => {
        if (u?.role === "admin") setGate("ok");
        else setGate("deny");
      })
      .catch(() => setGate("deny"));
  }, [router]);

  if (gate === "loading") {
    return (
      <div className="container-x py-8">
        <p className="text-sm text-gray-600">Checking admin access…</p>
      </div>
    );
  }

  if (gate !== "ok") {
    return (
      <div className="container-x max-w-lg space-y-3 py-8">
        <h1 className="text-xl font-bold">Admin area</h1>
        <p className="text-sm text-gray-700">
          This section is only for accounts with the admin role. Log in with the admin phone number, or ask the site owner to promote your user in the database.
        </p>
        <p className="text-sm">
          <Link href="/login" className="font-medium text-brand underline">
            Log in
          </Link>
          <span className="text-gray-400"> · </span>
          <Link href="/" className="font-medium text-brand underline">
            Home
          </Link>
          <span className="text-gray-400"> · </span>
          <Link href="/account" className="font-medium text-brand underline">
            My account
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
