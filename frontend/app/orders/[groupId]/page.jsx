"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../../utils/api";

export default function OrderDetailPage({ params }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    fetchWithAuth(`/orders/${params.groupId}`)
      .then(setData)
      .catch((e) => {
        const msg = e.message || "";
        if (isAuthErrorMessage(msg)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        setErr(msg);
      });
  }, [params.groupId, router]);

  if (err) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{err}</p>
        <Link href="/orders" className="text-brand underline">Back to orders</Link>
      </div>
    );
  }

  if (!data) return <p className="text-sm text-gray-600">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/orders" className="text-sm text-brand underline">← All orders</Link>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">Order</p>
        <p className="text-sm text-gray-700">
          Placed {new Date(data.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <p className="mt-1 text-sm">
          Status: <span className="font-medium capitalize">{data.status || "pending"}</span>
        </p>
        <p className="mt-2 text-lg font-bold text-brand">{Number(data.total_ugx).toLocaleString()} UGX</p>
        <p className="mt-1 text-xs text-gray-500">
          Pay the seller directly (cash, mobile money, etc.). This app records your request only.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Items</h2>
        {data.lines.map((line) => {
          const img = Array.isArray(line.image_urls) && line.image_urls.length ? line.image_urls[0] : "";
          return (
            <div key={line.id} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
              {img ? <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <Link href={`/listing/${line.listing_id}`} className="font-medium text-brand hover:underline">
                  {line.title}
                </Link>
                <p className="text-sm text-gray-600">
                  {Number(line.qty)} × {Number(line.unit_price_ugx).toLocaleString()} UGX ={" "}
                  {Number(line.amount_ugx).toLocaleString()} UGX
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
