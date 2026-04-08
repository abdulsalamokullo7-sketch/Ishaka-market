"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../utils/api";

function MessagesInboxInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingFilter = searchParams.get("listing_id") || "";

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    fetchWithAuth("/messages/inbox")
      .then(setRows)
      .catch((e) => {
        if (isAuthErrorMessage(e.message)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        setErr(e.message || "Could not load messages");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    if (!listingFilter) return rows;
    return rows.filter((r) => norm(r.listing_id) === norm(listingFilter));
  }, [rows, listingFilter]);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading messages...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Messages</h1>
        <p className="text-sm text-gray-600">Tap a conversation to see the product and chat.</p>
      </div>

      {listingFilter ? (
        <p className="text-sm text-gray-600">
          Showing this listing only.{" "}
          <button
            type="button"
            className="font-medium text-brand underline"
            onClick={() => router.push("/messages")}
          >
            Show all
          </button>
        </p>
      ) : null}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-600">No conversations yet.</p>
          <p className="mt-1 text-xs text-gray-500">Open a product and use “Message about this item” to start.</p>
          <Link href="/" className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={`${r.listing_id}-${r.peer_user_id}`}>
              <Link
                href={`/messages/${r.listing_id}/${r.peer_user_id}`}
                className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow"
              >
                {r.listing_image ? (
                  <img src={r.listing_image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[10px] text-gray-500">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{r.peer_full_name || "User"}</p>
                  <p className="line-clamp-1 text-sm text-gray-700">{r.listing_title}</p>
                  <p className="line-clamp-2 text-xs text-gray-500">{r.last_message_body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {r.last_message_at
                      ? new Date(r.last_message_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                      : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MessagesInboxPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-600">Loading messages...</p>}>
      <MessagesInboxInner />
    </Suspense>
  );
}

function norm(v) {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}
