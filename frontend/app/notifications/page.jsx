"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../utils/api";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    fetchWithAuth("/notifications")
      .then(setItems)
      .catch((e) => {
        const msg = e.message || "Could not load notifications.";
        if (isAuthErrorMessage(msg)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        setErr(msg);
      });
  }, [router]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Notifications</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {items.length === 0 ? (
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="rounded bg-white p-4 shadow">
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm text-gray-700">{n.message}</p>
              <p className="mt-1 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
