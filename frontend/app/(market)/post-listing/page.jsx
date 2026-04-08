"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../../utils/api";

export default function PostListingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category_id: "", area_id: "", image_urls: ""
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    Promise.all([api("/categories"), api("/areas")])
      .then(([c, a]) => {
        setCategories(c);
        setAreas(a);
      })
      .catch(() => setErr("Could not load categories/areas."));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const image_urls = form.image_urls.split(",").map((s) => s.trim()).filter(Boolean);
    const price = Number(form.price);
    if (!form.title?.trim() || !form.description?.trim() || !form.category_id || !form.area_id) {
      setErr("Fill title, description, category, and area.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setErr("Enter a valid price.");
      return;
    }
    if (image_urls.length < 1) {
      setErr("Add at least one image URL (comma-separated https:// links).");
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      category_id: form.category_id,
      area_id: form.area_id,
      image_urls,
      requires_approval: false
    };
    try {
      await fetchWithAuth("/seller/listings", { method: "POST", body: JSON.stringify(payload) });
      setMsg("Listing created successfully.");
    } catch (e2) {
      const msg2 = e2.message || "Failed to post.";
      if (isAuthErrorMessage(msg2)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(msg2);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Post Listing</h1>
      <p className="text-sm text-gray-600">
        You must be <strong>logged in</strong> as an <strong>approved seller</strong>.{" "}
        <Link href="/login" className="text-brand underline">Log in</Link>
        {" · "}
        <Link href="/apply-seller" className="text-brand underline">Apply as seller</Link>
        {" · "}
        <Link href="/register" className="text-brand underline">Register</Link>
      </p>
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
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button className="w-full rounded bg-brand py-2 text-white">Submit</button>
    </form>
  );
}
