"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function AdminSellersPage() {
  const [apps, setApps] = useState([]);
  async function load() { setApps(await api("/admin/seller-applications")); }
  useEffect(() => { load(); }, []);

  async function update(id, status) {
    await api(`/admin/seller-applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Seller Applications</h1>
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
