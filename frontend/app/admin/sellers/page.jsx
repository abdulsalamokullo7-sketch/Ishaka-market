"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, getStoredUserRole, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminSellersPage() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [err, setErr] = useState("");
  async function load() { setApps(await fetchWithAuth("/admin/seller-applications")); }
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
    load().catch((e) => {
      const msg = e.message || "Could not load seller applications.";
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

  async function update(id, status) {
    setErr("");
    try {
      await fetchWithAuth(`/admin/seller-applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e2) {
      const msg = e2.message || "Could not update application.";
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
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Seller Applications</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {apps.map((a) => (
        <div key={a.id} className="rounded bg-white p-3 shadow">
          <p className="font-semibold">{a.business_name} - {a.applicant_name}</p>
          <p className="text-sm">{a.area_name} | {a.category_name || "No category"} | Status: {a.status}</p>
          <div className="mt-2 flex gap-2">
            <button className="rounded bg-green-700 px-3 py-1 text-white" onClick={() => update(a.id, "approved")}>Approve</button>
            <button className="rounded bg-red-700 px-3 py-1 text-white" onClick={() => update(a.id, "rejected")}>Reject</button>
            <button className="rounded bg-amber-600 px-3 py-1 text-white" onClick={() => update(a.id, "more_info")}>More info</button>
          </div>
        </div>
      ))}
    </div>
  );
}
