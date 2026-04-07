"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  async function load() { setCategories(await api("/categories")); }
  useEffect(() => { load(); }, []);
  async function submit(e) {
    e.preventDefault();
    await api("/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
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
        {categories.map((c) => <p key={c.id}>{c.name}</p>)}
      </div>
    </div>
  );
}
