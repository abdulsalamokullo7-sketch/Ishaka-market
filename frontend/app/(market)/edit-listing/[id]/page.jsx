"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../../utils/api";
import { ACCEPT_ATTR, MAX_IMAGES, partitionImageFiles, uploadListingImages } from "../../../../utils/listingImages";

export default function EditListingPage({ params }) {
  const router = useRouter();
  const listingId = params.id;
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [files, setFiles] = useState([]);
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
        const urls = Array.isArray(l.image_urls) ? l.image_urls.filter(Boolean) : [];
        setExistingImageUrls(urls);
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

  function applyGalleryFiles(list) {
    const { ok, rejected } = partitionImageFiles(list);
    const next = ok.slice(0, MAX_IMAGES);
    setFiles(next);
    if (rejected.length) {
      setErr(
        `Not supported (use JPG, PNG, or WebP only — not HEIC, GIF, etc.): ${rejected.slice(0, 4).join(", ")}${rejected.length > 4 ? "…" : ""}`
      );
    } else if (next.length >= MAX_IMAGES) {
      setErr(`Maximum ${MAX_IMAGES} photos.`);
    } else {
      setErr("");
    }
  }

  function appendCameraFiles(list) {
    const { ok, rejected } = partitionImageFiles(list);
    if (!ok.length && !rejected.length) return;
    setFiles((prev) => [...prev, ...ok].slice(0, MAX_IMAGES));
    if (rejected.length) {
      setErr(
        `That photo type is not allowed (use JPG, PNG, or WebP). If the camera saved HEIC, change iPhone Settings → Camera → Formats to “Most Compatible”, or export the photo as JPEG.`
      );
      return;
    }
    setErr("");
  }

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
    if (files.length > MAX_IMAGES) {
      setErr(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      condition: form.condition,
      category_id: form.category_id,
      area_id: form.area_id
    };

    setSaving(true);
    try {
      if (files.length > 0) {
        const image_urls = await uploadListingImages(files, fetchWithAuth);
        body.image_urls = image_urls;
      }
      await fetchWithAuth(`/seller/listings/${listingId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      setMsg("Saved.");
      router.push("/seller-account");
      router.refresh();
    } catch (e2) {
      const m = e2.message || "Could not save.";
      if (isAuthErrorMessage(m)) {
        clearAuth();
        router.replace(loginRedirectUrl(`/edit-listing/${listingId}`));
        return;
      }
      setErr(m);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;

  const saveLabel = saving ? (files.length ? "Uploading photos…" : "Saving…") : "Save changes";

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Edit listing</h1>
        <Link href="/seller-account" className="text-sm font-medium text-brand underline">
          Back to my products
        </Link>
      </div>
      <p className="text-xs text-gray-600">
        Current photos are shown below. To replace them, add new photos (gallery or camera); on save, the listing uses only the new set (up to {MAX_IMAGES}). Leave new photos empty to keep existing images.
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

          {existingImageUrls.length ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <p className="text-sm font-semibold text-gray-900">Current photos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {existingImageUrls.map((u) => (
                  <img key={u} src={u} alt="" className="h-20 w-20 rounded border border-gray-200 object-cover" />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Replace photos (optional)</p>
              <p className="mt-1 text-xs text-gray-600">
                Allowed formats: <strong>JPG, JPEG, PNG, WebP</strong>. Other types (e.g. <strong>HEIC</strong>) are blocked — convert or export as JPEG/PNG first.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col rounded-lg border-2 border-dashed border-emerald-200 bg-white p-3 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/40">
                <span className="text-sm font-semibold text-gray-900">Choose from gallery</span>
                <span className="mt-0.5 text-xs text-gray-600">Pick photos to replace the listing set</span>
                <input
                  className="mt-2 w-full min-w-0 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:font-medium file:text-white"
                  type="file"
                  accept={ACCEPT_ATTR}
                  multiple
                  onChange={(e) => {
                    applyGalleryFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex cursor-pointer flex-col rounded-lg border-2 border-dashed border-amber-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:bg-amber-50/40">
                <span className="text-sm font-semibold text-gray-900">Take photo with camera</span>
                <span className="mt-0.5 text-xs text-gray-600">Add shots one at a time</span>
                <input
                  className="mt-2 w-full min-w-0 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-amber-600 file:px-3 file:py-1.5 file:font-medium file:text-white"
                  type="file"
                  accept={ACCEPT_ATTR}
                  capture="environment"
                  onChange={(e) => {
                    appendCameraFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-700">
                {files.length} / {MAX_IMAGES} new photo(s) queued
                {files.length ? " — replaces all current photos when you save" : ""}
              </p>
              {files.length ? (
                <button
                  type="button"
                  className="text-xs font-medium text-brand underline"
                  onClick={() => {
                    setFiles([]);
                    setErr("");
                  }}
                >
                  Clear new photos
                </button>
              ) : null}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full rounded bg-brand py-2 text-white disabled:opacity-60">
            {saveLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
