"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAuth,
  fetchWithAuth,
  getStoredUserRole,
  isAuthErrorMessage,
  isForbiddenMessage,
  loginRedirectUrl
} from "../../../utils/api";

export default function AdminListingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load(p = page) {
    const res = await fetchWithAuth(`/admin/listings?page=${p}&limit=20`);
    setRows(res.data || []);
    setTotal(res.total ?? 0);
    setPage(res.page ?? p);
  }

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
    load(1).catch((e) => {
      const msg = e.message || "Could not load listings.";
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

  async function patchListing(id, body) {
    setErr("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load(page);
    } catch (e) {
      setErr(e.message || "Could not update listing.");
    } finally {
      setBusyId("");
    }
  }

  async function removeListing(id) {
    if (!window.confirm("Delete this listing permanently?")) return;
    setErr("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/listings/${id}`, { method: "DELETE" });
      await load(page);
    } catch (e) {
      setErr(e.message || "Could not delete listing.");
    } finally {
      setBusyId("");
    }
  }

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Listings (moderation)</h1>
        <Link href="/admin" className="text-sm font-medium text-brand underline">
          Admin home
        </Link>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="overflow-x-auto rounded bg-white p-3 shadow">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Title</th>
              <th className="py-2 pr-2">Seller</th>
              <th className="py-2 pr-2">Price</th>
              <th className="py-2 pr-2">Flags</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b align-top">
                <td className="py-2 pr-2">
                  <Link href={`/listing/${l.id}`} className="font-medium text-brand hover:underline">
                    {l.title}
                  </Link>
                </td>
                <td className="py-2 pr-2 text-gray-700">{l.seller_name}</td>
                <td className="py-2 pr-2">{Number(l.price).toLocaleString()} UGX</td>
                <td className="py-2 pr-2 text-xs text-gray-600">
                  {l.approved ? "approved" : "not approved"} · {l.is_available === false ? "sold" : "available"}
                  {l.is_featured ? " · featured" : ""}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                      onClick={() => patchListing(l.id, { approved: !l.approved })}
                    >
                      {l.approved ? "Unapprove" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                      onClick={() => patchListing(l.id, { is_available: l.is_available === false })}
                    >
                      {l.is_available === false ? "Mark available" : "Mark sold"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      onClick={() => removeListing(l.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-gray-500">
                  No listings.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => load(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
