"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api("/admin/analytics").then(setStats).catch(() => null); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/admin/sellers" className="rounded bg-white p-3 shadow">Seller Approvals</Link>
        <Link href="/admin/fares" className="rounded bg-white p-3 shadow">Delivery Fares</Link>
        <Link href="/admin/areas" className="rounded bg-white p-3 shadow">Areas</Link>
        <Link href="/admin/categories" className="rounded bg-white p-3 shadow">Categories</Link>
      </div>
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
