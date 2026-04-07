const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export async function api(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    throw new Error(res.statusText || "Request failed");
  }
  if (!res.ok) {
    const msg =
      Array.isArray(data.errors) && data.errors.length
        ? data.errors.join(" ")
        : data.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export { API_BASE };
