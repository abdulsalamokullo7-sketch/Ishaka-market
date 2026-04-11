"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminAreasPage() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setAreas(await api("/areas"));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load().catch(() => setErr("Could not load areas."));
  }, [router, load]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await fetchWithAuth("/admin/areas", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      await load();
    } catch (e2) {
      const msg = e2.message || "Failed to save area.";
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

  async function removeArea(id, label) {
    if (!window.confirm(`Delete area "${label}"? This fails if users or listings still use it.`)) return;
    setErr("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/areas/${id}`, { method: "DELETE" });
      await load();
    } catch (e2) {
      const msg = e2.message || "Could not delete area.";
      if (isAuthErrorMessage(msg)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(msg);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="rounded bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Area management</h1>
        <p className="mt-1 text-xs text-gray-600">Add new areas or delete unused ones. Deletion is blocked while the area is linked to users, listings, or applications.</p>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded border p-2" placeholder="New area name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="rounded bg-brand px-4 text-white">
            Save
          </button>
        </div>
      </form>
      <div className="rounded bg-white p-4 shadow">
        {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
        <ul className="divide-y divide-gray-100">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="font-medium text-gray-900">{a.name}</span>
              <button
                type="button"
                disabled={busyId === a.id}
                onClick={() => removeArea(a.id, a.name)}
                className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busyId === a.id ? "…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
