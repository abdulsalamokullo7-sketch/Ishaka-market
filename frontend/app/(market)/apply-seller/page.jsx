"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function ApplySellerPage() {
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    area_id: "",
    category_id: "",
    id_document_url: "",
    notes: ""
  });

  useEffect(() => {
    Promise.all([api("/areas"), api("/categories")]).then(([a, c]) => {
      setAreas(a);
      setCategories(c);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    await api("/seller/apply", { method: "POST", body: JSON.stringify(form) });
    setMsg("Application submitted. Status: PENDING.");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Seller Application</h1>
      <input className="w-full rounded border p-2" placeholder="Business name" onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
        <option value="">Select area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">Category focus</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input className="w-full rounded border p-2" placeholder="ID document URL (optional)" onChange={(e) => setForm({ ...form, id_document_url: e.target.value })} />
      <textarea className="w-full rounded border p-2" placeholder="Notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button className="w-full rounded bg-brand py-2 text-white">Submit Application</button>
    </form>
  );
}
