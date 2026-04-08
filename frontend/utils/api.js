export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-change"));
}

export function isAuthErrorMessage(msg = "") {
  return /missing token|invalid token|unauthorized/i.test(msg);
}

export function isForbiddenMessage(msg = "") {
  return /forbidden/i.test(msg);
}

export function getStoredUserRole() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role || null;
  } catch {
    return null;
  }
}

export function loginRedirectUrl() {
  if (typeof window === "undefined") return "/login?reason=auth";
  const returnTo = `${window.location.pathname}${window.location.search || ""}`;
  return `/login?reason=auth&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function fetchWithAuth(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
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
