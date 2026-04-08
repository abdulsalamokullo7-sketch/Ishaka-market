"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../utils/api";

export default function PostListingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category_id: "", area_id: ""
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    syncAuthSession();
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
    const price = Number(form.price);
    if (!form.title?.trim() || !form.description?.trim() || !form.category_id || !form.area_id) {
      setErr("Fill title, description, category, and area.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setErr("Enter a valid price.");
      return;
    }
    if (files.length < 1) {
      setErr("Add at least one image from your device or camera.");
      return;
    }
    setUploading(true);
    let image_urls = [];
    try {
      for (const file of files) {
        const sign = await fetchWithAuth("/uploads/sign", {
          method: "POST",
          body: JSON.stringify({
            file_name: file.name || "image.jpg",
            content_type: file.type || "image/jpeg"
          })
        });
        const uploadRes = await fetch(sign.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image.");
        image_urls.push(sign.file_url);
      }
    } catch (uploadErr) {
      setUploading(false);
      setErr(uploadErr.message || "Image upload failed.");
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
      if (/forbidden|seller not approved/i.test(msg2)) {
        const refreshed = await syncAuthSession();
        if (refreshed?.role === "seller") {
          try {
            await fetchWithAuth("/seller/listings", { method: "POST", body: JSON.stringify(payload) });
            setMsg("Listing created successfully.");
            return;
          } catch {
            // Fall through to user-facing seller approval hint.
          }
        }
      }
      setErr(msg2);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Post Listing</h1>
      <p className="text-sm text-gray-600">
        You are logged in. You must still be approved as a seller before posting.
        {" "}
        <Link href="/apply-seller" className="text-brand underline">Apply as seller</Link>
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
      <div className="space-y-2 rounded border p-2">
        <p className="text-sm font-medium">Listing images</p>
        <input
          className="w-full rounded border p-2"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <input
          className="w-full rounded border p-2"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
        />
        <p className="text-xs text-gray-600">{files.length} image(s) selected</p>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button disabled={uploading} className="w-full rounded bg-brand py-2 text-white disabled:opacity-60">
        {uploading ? "Uploading images..." : "Submit"}
      </button>
    </form>
  );
}
