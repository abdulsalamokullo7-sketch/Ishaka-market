"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../utils/api";

export default function OrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    fetchWithAuth("/orders/me")
      .then(setRows)
      .catch((e) => {
        const msg = e.message || "";
        if (isAuthErrorMessage(msg)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        setErr(msg);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-sm text-gray-600">Loading orders...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {rows.length === 0 && !err ? (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">You have not placed any orders yet.</p>
          <Link href="/" className="mt-2 inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">
            Browse products
          </Link>
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.order_group_id}>
            <Link
              href={`/orders/${o.order_group_id}`}
              className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm transition hover:shadow"
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(o.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-xs text-gray-600">
                  {o.line_count} item(s) · {String(o.status || "pending")}
                </p>
              </div>
              <p className="font-semibold text-brand">{Number(o.total_ugx).toLocaleString()} UGX</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
