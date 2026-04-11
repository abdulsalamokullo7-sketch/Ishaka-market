"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../utils/api";

const MAX_IMAGES = 5;

/** Must match backend /uploads/sign (image/jpeg, image/png, image/webp). */
const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

function isAllowedImageFile(file) {
  const mime = (file.type || "").toLowerCase().trim();
  if (ACCEPT_TYPES.has(mime)) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function partitionImageFiles(fileList) {
  const ok = [];
  const rejected = [];
  for (const f of fileList) {
    if (isAllowedImageFile(f)) ok.push(f);
    else rejected.push(f.name || f.type || "Unknown file");
  }
  return { ok, rejected };
}

export default function PostListingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", price: "", condition: "used", category_id: "", area_id: ""
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function compressImage(file) {
    // Keep small files as-is to avoid unnecessary quality loss.
    if (file.size <= 350 * 1024) return file;
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const i = new Image();
      i.onload = () => {
        URL.revokeObjectURL(url);
        resolve(i);
      };
      i.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image."));
      };
      i.src = url;
    });

    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.78);
    });
    if (!blob) return file;
    return new File([blob], `${(file.name || "image").replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp"
    });
  }

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
      setErr("Add at least one photo (JPG, PNG, or WebP) from gallery or camera.");
      return;
    }
    if (files.length > MAX_IMAGES) {
      setErr(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    setUploading(true);
    let image_urls = [];
    try {
      for (const file of files) {
        const optimized = await compressImage(file);
        const sign = await fetchWithAuth("/uploads/sign", {
          method: "POST",
          body: JSON.stringify({
            file_name: optimized.name || "image.webp",
            content_type: optimized.type || "image/webp"
          })
        });
        const uploadRes = await fetch(sign.upload_url, {
          method: "PUT",
          headers: { "Content-Type": optimized.type || "image/webp" },
          body: optimized
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
      condition: form.condition,
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

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Sell an item</h1>
      <p className="text-sm text-gray-600">
        You are logged in. You must still be approved as a seller before your listing goes live.
        {" "}
        <Link href="/apply-seller" className="text-brand underline">Apply as seller</Link>
      </p>
      <input className="w-full rounded border p-2" placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full rounded border p-2" placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input className="w-full rounded border p-2" type="number" placeholder="Price (UGX)" onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <select className="w-full rounded border bg-white p-2 text-base" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
        <option value="new">Condition: New</option>
        <option value="used">Condition: Used</option>
        <option value="refurbished">Condition: Refurbished</option>
      </select>
      <select className="w-full rounded border bg-white p-2 text-base" onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">Select category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border bg-white p-2 text-base" onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
        <option value="">Select area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Listing photos</p>
          <p className="mt-1 text-xs text-gray-600">
            Allowed formats: <strong>JPG, JPEG, PNG, WebP</strong>. Other types (e.g. <strong>HEIC</strong>, GIF, PDF) are blocked by the uploader — convert or export as JPEG/PNG first.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer flex-col rounded-lg border-2 border-dashed border-emerald-200 bg-white p-3 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/40">
            <span className="text-sm font-semibold text-gray-900">Choose from gallery</span>
            <span className="mt-0.5 text-xs text-gray-600">Pick existing photos (multi-select)</span>
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
            <span className="mt-0.5 text-xs text-gray-600">Opens the camera on phones; one shot at a time, then add more if needed</span>
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
        <p className="text-xs font-medium text-gray-700">
          {files.length} / {MAX_IMAGES} photo(s) ready to upload
        </p>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-green-700">{msg}</p> : null}
      <button disabled={uploading} className="w-full rounded bg-brand py-2 text-white disabled:opacity-60">
        {uploading ? "Uploading photos…" : "Publish listing"}
      </button>
    </form>
  );
}
