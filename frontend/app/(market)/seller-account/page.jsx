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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Seller Account</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="rounded bg-white p-4 shadow">
        <p className="font-semibold">{seller?.full_name || "Seller"}</p>
        <p className="text-sm text-gray-600">Phone: {seller?.phone || "-"}</p>
        <p className="text-sm text-gray-600">Status: {seller?.status || "not approved"}</p>
        <p className="text-sm text-gray-600">Badge: {seller?.badge || "new"}</p>
        <Link href="/post-listing" className="mt-2 inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">
          Add New Product
        </Link>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">My Products ({listings.length})</h2>
        {listings.map((l) => (
          <div key={l.id} className="rounded bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-gray-600">
                  {l.area_name} · {Number(l.price).toLocaleString()} UGX · {(l.condition || "used").toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === l.id}
                onClick={() => removeListing(l.id)}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-60"
              >
                {busyId === l.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {listings.length === 0 ? <p className="text-sm text-gray-600">No products yet.</p> : null}
      </div>
    </div>
  );
}
