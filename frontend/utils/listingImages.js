/** Must match backend /uploads/sign (image/jpeg, image/png, image/webp). */
export const MAX_IMAGES = 5;
const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function isAllowedImageFile(file) {
  const mime = (file.type || "").toLowerCase().trim();
  if (ACCEPT_TYPES.has(mime)) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|webp)$/i.test(name);
}

export function partitionImageFiles(fileList) {
  const ok = [];
  const rejected = [];
  for (const f of fileList) {
    if (isAllowedImageFile(f)) ok.push(f);
    else rejected.push(f.name || f.type || "Unknown file");
  }
  return { ok, rejected };
}

export async function compressImage(file) {
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

/** Upload local files via signed URLs; returns public image_urls in order. */
export async function uploadListingImages(files, fetchWithAuth) {
  const image_urls = [];
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
  return image_urls;
}
