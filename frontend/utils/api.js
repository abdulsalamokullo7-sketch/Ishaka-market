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

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const normalized = base64 + (pad ? "=".repeat(4 - pad) : "");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getStoredUserRole() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.role) return parsed.role;
    }
  } catch {
    // Ignore and fallback to token payload.
  }
  const token = localStorage.getItem("token") || "";
  const payload = decodeJwtPayload(token);
  return payload?.role || null;
}

export async function hasAdminAccess() {
  const user = await syncAuthSession();
  if (user?.role) return user.role === "admin";
  return getStoredUserRole() === "admin";
}

/** Only allow same-origin paths (prevents open redirects). */
export function safeReturnPath(raw) {
  if (raw == null || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "";
  return t;
}

/**
 * @param {string} [explicitReturnPath] - e.g. `/messages/{listingId}/{sellerUserId}`; defaults to current page
 */
export function loginRedirectUrl(explicitReturnPath) {
  if (typeof window === "undefined") return "/login?reason=auth";
  let returnTo;
  if (explicitReturnPath != null && String(explicitReturnPath).trim() !== "") {
    returnTo = safeReturnPath(String(explicitReturnPath).trim());
  }
  if (!returnTo) {
    returnTo = `${window.location.pathname}${window.location.search || ""}`;
  }
  return `/login?reason=auth&returnTo=${encodeURIComponent(returnTo)}`;
}

/** Link to register with optional redirect after signup (must be a safe internal path). */
export function registerUrl(explicitReturnPath) {
  const safe = explicitReturnPath ? safeReturnPath(String(explicitReturnPath).trim()) : "";
  return safe ? `/register?returnTo=${encodeURIComponent(safe)}` : "/register";
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

export async function syncAuthSession() {
  if (typeof window === "undefined") return null;
  try {
    const data = await fetchWithAuth("/auth/me");
    if (data?.token && data?.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-change"));
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}
