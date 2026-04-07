"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function ApplySellerPage() {
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
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
    setErr("");
    setMsg("");
    if (!form.business_name?.trim() || !form.phone?.trim() || !form.area_id) {
      setErr("Fill business name, phone, and area.");
      return;
    }
    const payload = {
      business_name: form.business_name.trim(),
      phone: form.phone.trim(),
      area_id: form.area_id,
      notes: form.notes?.trim() || undefined,
      id_document_url: form.id_document_url?.trim() || undefined,
      ...(form.category_id ? { category_id: form.category_id } : { category_id: null })
    };
    try {
      await api("/seller/apply", { method: "POST", body: JSON.stringify(payload) });
      setMsg("Application submitted. Status: PENDING.");
    } catch (e2) {
      setErr(e2.message || "Could not submit. Are you logged in?");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Seller Application</h1>
      <p className="text-sm text-gray-600">
        You need an account first.{" "}
        <Link href="/login" className="text-brand underline">Log in</Link>
        {" "}or{" "}
        <Link href="/register" className="text-brand underline">register</Link>
        , then submit.
      </p>
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
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button className="w-full rounded bg-brand py-2 text-white">Submit Application</button>
    </form>
  );
}
