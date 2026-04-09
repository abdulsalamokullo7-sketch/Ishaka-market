"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAuth,
  fetchWithAuth,
  isAuthErrorMessage,
  isForbiddenMessage,
  loginRedirectUrl
} from "../../../utils/api";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    fetchWithAuth("/admin/orders")
      .then(setRows)
      .catch((e) => {
        const msg = e.message || "Could not load orders.";
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Orders</h1>
        <Link href="/admin" className="text-sm font-medium text-brand underline">
          Admin home
        </Link>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="overflow-x-auto rounded bg-white p-3 shadow">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">When</th>
              <th className="py-2 pr-2">Buyer</th>
              <th className="py-2 pr-2">Seller</th>
              <th className="py-2 pr-2">Listing</th>
              <th className="py-2 pr-2">Qty</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2 pr-2 whitespace-nowrap text-gray-600">
                  {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                </td>
                <td className="py-2 pr-2">
                  <span className="font-medium">{o.buyer_name}</span>
                  <span className="block text-xs text-gray-500">{o.buyer_phone}</span>
                </td>
                <td className="py-2 pr-2">{o.seller_name}</td>
                <td className="py-2 pr-2">
                  <Link href={`/listing/${o.listing_id}`} className="text-brand hover:underline">
                    {o.listing_title}
                  </Link>
                </td>
                <td className="py-2 pr-2">{o.qty ?? 1}</td>
                <td className="py-2">{Number(o.amount_ugx).toLocaleString()} UGX</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
