"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setCategories(await api("/categories"));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load().catch(() => setErr("Could not load categories."));
  }, [router, load]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await fetchWithAuth("/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      await load();
    } catch (e2) {
      const msg = e2.message || "Failed to save category.";
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

  async function removeCategory(id, label) {
    if (!window.confirm(`Delete category "${label}"? This fails if listings still use it.`)) return;
    setErr("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (e2) {
      const msg = e2.message || "Could not delete category.";
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
        <h1 className="text-xl font-bold">Category management</h1>
        <p className="mt-1 text-xs text-gray-600">Add categories or delete unused ones. Deletion is blocked while listings use the category.</p>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded border p-2" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="rounded bg-brand px-4 text-white">
            Save
          </button>
        </div>
      </form>
      <div className="rounded bg-white p-4 shadow">
        {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
        <ul className="divide-y divide-gray-100">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="font-medium text-gray-900">{c.name}</span>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => removeCategory(c.id, c.name)}
                className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busyId === c.id ? "…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
