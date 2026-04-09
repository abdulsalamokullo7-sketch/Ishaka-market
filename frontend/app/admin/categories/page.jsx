"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  async function load() { setCategories(await api("/categories")); }
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load();
  }, [router]);
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await fetchWithAuth("/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      load();
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
  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="rounded bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Category Management</h1>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded border p-2" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="rounded bg-brand px-4 text-white">Save</button>
        </div>
      </form>
      <div className="rounded bg-white p-4 shadow">
        {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
        {categories.map((c) => <p key={c.id}>{c.name}</p>)}
      </div>
    </div>
  );
}
