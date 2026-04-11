"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../../utils/api";

export default function EditListingPage({ params }) {
  const router = useRouter();
  const listingId = params.id;
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    condition: "used",
    category_id: "",
    area_id: ""
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace(loginRedirectUrl(`/edit-listing/${listingId}`));
      return;
    }
    syncAuthSession().catch(() => null);
    (async () => {
      try {
        const [c, a, mine] = await Promise.all([
          api("/categories"),
          api("/areas"),
          fetchWithAuth("/seller/listings/me")
        ]);
        setCategories(c);
        setAreas(a);
        const l = Array.isArray(mine) ? mine.find((x) => x.id === listingId) : null;
        if (!l) {
          setNotFound(true);
          setErr("Listing not found or you do not own it.");
          setLoading(false);
          return;
        }
        setForm({
          title: l.title || "",
          description: l.description || "",
          price: String(l.price ?? ""),
          condition: l.condition || "used",
          category_id: l.category_id || "",
          area_id: l.area_id || ""
        });
      } catch (e) {
        const m = e.message || "Could not load listing.";
        if (isAuthErrorMessage(m)) {
          clearAuth();
          router.replace(loginRedirectUrl(`/edit-listing/${listingId}`));
          return;
        }
        setErr(m);
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const price = Number(form.price);
    if (!form.title?.trim() || !form.description?.trim() || !form.category_id || !form.area_id) {
      setErr("Fill title, description, category, and area.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setErr("Enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      await fetchWithAuth(`/seller/listings/${listingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          price,
          condition: form.condition,
          category_id: form.category_id,
          area_id: form.area_id
        })
      });
      setMsg("Saved.");
      router.push("/seller-account");
      router.refresh();
    } catch (e2) {
      setErr(e2.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Edit listing</h1>
        <Link href="/seller-account" className="text-sm font-medium text-brand underline">
          Back to my products
        </Link>
      </div>
      <p className="text-xs text-gray-600">
        To change photos, use <strong>Sell an item</strong> to create a new listing or ask support; this screen updates text, price, category, area, and condition only.
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      {!notFound ? (
        <form onSubmit={submit} className="space-y-3 rounded bg-white p-4 shadow">
          <input
            className="w-full rounded border p-2"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full rounded border p-2"
            rows={5}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="w-full rounded border p-2"
            type="number"
            min={0}
            placeholder="Price (UGX)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <select className="w-full rounded border bg-white p-2" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="new">Condition: New</option>
            <option value="used">Condition: Used</option>
            <option value="refurbished">Condition: Refurbished</option>
          </select>
          <select className="w-full rounded border bg-white p-2" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="w-full rounded border bg-white p-2" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Select area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="w-full rounded bg-brand py-2 text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
