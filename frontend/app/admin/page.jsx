"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, fetchWithAuth, getStoredUserRole, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../utils/api";

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    if (getStoredUserRole() !== "admin") {
      setErr("Admin access only. Log in with an admin account.");
      return;
    }
    fetchWithAuth("/admin/analytics")
      .then(setStats)
      .catch((e) => {
        const msg = e.message || "Could not load admin analytics.";
        if (isAuthErrorMessage(msg)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        if (isForbiddenMessage(msg)) {
          setErr("Admin access only. Log in with an admin account.");
          return;
        }
        setErr(msg);
      });
  }, [router]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/admin/users" className="rounded bg-white p-3 shadow">Users</Link>
        <Link href="/admin/sellers" className="rounded bg-white p-3 shadow">Seller Approvals</Link>
        <Link href="/admin/fares" className="rounded bg-white p-3 shadow">Delivery Fares</Link>
        <Link href="/admin/areas" className="rounded bg-white p-3 shadow">Areas</Link>
        <Link href="/admin/categories" className="rounded bg-white p-3 shadow">Categories</Link>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {stats ? (
        <div className="rounded bg-white p-4 shadow">
          <p>Users: {stats.users_total}</p>
          <p>Approved Sellers: {stats.sellers_approved}</p>
          <p>Pending Applications: {stats.pending_applications}</p>
          <p>Active Listings: {stats.active_listings}</p>
        </div>
      ) : null}
    </div>
  );
}
