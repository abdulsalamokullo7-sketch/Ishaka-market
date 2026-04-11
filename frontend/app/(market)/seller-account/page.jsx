"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../utils/api";

export default function SellerAccountPage() {
  const router = useRouter();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    const [sellerMe, myListings] = await Promise.all([
      fetchWithAuth("/seller/me"),
      fetchWithAuth("/seller/listings/me")
    ]);
    setSeller(sellerMe);
    setListings(myListings);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    syncAuthSession().then((u) => {
      if (u && u.role !== "seller") {
        setErr("Your account is not a seller yet. Apply and wait for approval.");
      }
    });
    load().catch((e) => {
      const msg = e.message || "Could not load seller account.";
      if (isAuthErrorMessage(msg)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(msg);
    });
  }, [router]);

  async function removeListing(id) {
    setErr("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/seller/listings/${id}`, { method: "DELETE" });
      setListings((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e.message || "Could not delete listing.");
    } finally {
      setBusyId("");
    }
  }

  async function setAvailability(id, is_available) {
    setErr("");
    setBusyId(id);
    try {
      const updated = await fetchWithAuth(`/seller/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available })
      });
      setListings((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
    } catch (e) {
      setErr(e.message || "Could not update listing.");
    } finally {
      setBusyId("");
    }
  }

  function logout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Seller Account</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="rounded bg-white p-4 shadow">
        <p className="font-semibold">{seller?.full_name || "Seller"}</p>
        <p className="text-sm text-gray-600">Phone: {seller?.phone || "-"}</p>
        <p className="text-sm text-gray-600">Status: {seller?.status || "not approved"}</p>
        <p className="text-sm text-gray-600">Badge: {seller?.badge || "new"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/post-listing" className="inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">
            Sell an item
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">My Products ({listings.length})</h2>
        {listings.map((l) => (
          <div key={l.id} className="rounded bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  {l.is_available === false ? (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold uppercase text-gray-700">Sold</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Available</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {l.area_name} · {Number(l.price).toLocaleString()} UGX · {(l.condition || "used").toUpperCase()}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <Link href={`/listing/${l.id}`} className="font-medium text-brand underline">
                    View on site
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link href={`/edit-listing/${l.id}`} className="font-medium text-brand underline">
                    Edit details
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {l.is_available !== false ? (
                  <button
                    type="button"
                    disabled={busyId === l.id}
                    onClick={() => setAvailability(l.id, false)}
                    className="rounded border border-amber-700/40 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    {busyId === l.id ? "…" : "Mark sold"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === l.id}
                    onClick={() => setAvailability(l.id, true)}
                    className="rounded border border-brand/40 bg-emerald-50 px-3 py-1 text-sm font-medium text-brand hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {busyId === l.id ? "…" : "Mark available"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === l.id}
                  onClick={() => removeListing(l.id)}
                  className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-60"
                >
                  {busyId === l.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {listings.length === 0 ? <p className="text-sm text-gray-600">No products yet.</p> : null}
      </div>
    </div>
  );
}
