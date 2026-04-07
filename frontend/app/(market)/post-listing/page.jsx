"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function PostListingPage() {
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category_id: "", area_id: "", image_urls: ""
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api("/categories"), api("/areas")]).then(([c, a]) => {
      setCategories(c); setAreas(a);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), image_urls: form.image_urls.split(",").map((s) => s.trim()).filter(Boolean) };
    await api("/seller/listings", { method: "POST", body: JSON.stringify(payload) });
    setMsg("Listing created successfully.");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Post Listing</h1>
      <input className="w-full rounded border p-2" placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full rounded border p-2" placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input className="w-full rounded border p-2" type="number" placeholder="Price (UGX)" onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">Select category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
        <option value="">Select area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input className="w-full rounded border p-2" placeholder="Image URLs (comma separated)" onChange={(e) => setForm({ ...form, image_urls: e.target.value })} />
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button className="w-full rounded bg-brand py-2 text-white">Submit</button>
    </form>
  );
}
