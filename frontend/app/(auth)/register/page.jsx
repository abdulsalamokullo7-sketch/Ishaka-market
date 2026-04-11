"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { markAuthSessionFresh, safeReturnPath } from "../../../utils/api";

export default function RegisterPage() {
  const [areas, setAreas] = useState([]);
  const [areasErr, setAreasErr] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState(false);
  const [redirectHint, setRedirectHint] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", password: "", area_id: "" });
  const [returnTo, setReturnTo] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      setReturnTo(p.get("returnTo") || "");
    }
    api("/areas")
      .then(setAreas)
      .catch(() => setAreasErr("Could not load areas. Check API URL and try again."));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!form.full_name?.trim() || form.full_name.trim().length < 2) {
      setErr("Enter your full name (at least 2 characters).");
      return;
    }
    if (!form.phone?.trim() || form.phone.trim().length < 8) {
      setErr("Enter a valid phone number (at least 8 digits/characters).");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (!form.area_id) {
      setErr("Select your area.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          area_id: form.area_id
        })
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-change"));
      markAuthSessionFresh();
      const next = returnTo ? safeReturnPath(returnTo) : "";
      const path = next || "/";
      setRedirectHint(path === "/" ? "the home page" : "where you left off");
      setCreated(true);
      setLoading(false);
      window.setTimeout(() => {
        router.replace(path);
      }, 1800);
    } catch (e2) {
      const msg = e2.message || "Registration failed";
      setErr(
        msg.includes("already") || msg.includes("Phone")
          ? "This phone number is already registered. Try logging in instead."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/90 p-6 text-center shadow">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden>
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-emerald-900">Account created</h1>
        <p className="text-sm text-emerald-800">
          You&apos;re signed in. Redirecting to {redirectHint}…
        </p>
        <p className="text-xs text-emerald-700/90">If nothing happens, you can open the site from the menu.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Create account</h1>
      {safeReturnPath(returnTo) ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
          After you sign up, we&apos;ll take you back to continue messaging about this product.
        </p>
      ) : null}
      {areasErr ? <p className="text-sm text-amber-700">{areasErr}</p> : null}
      <input
        className="w-full rounded border p-2"
        placeholder="Full name"
        autoComplete="name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Phone (e.g. +2567...)"
        autoComplete="tel"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <div className="space-y-1">
        <input
          className="w-full rounded border p-2"
          type={showPassword ? "text" : "password"}
          placeholder="Password (min 6 characters)"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="rounded border-gray-300" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show password
        </label>
      </div>
      <select
        className="w-full rounded border p-2"
        value={form.area_id}
        onChange={(e) => setForm({ ...form, area_id: e.target.value })}
      >
        <option value="">Select area</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="submit" disabled={loading || !!areasErr || areas.length === 0} className="w-full rounded bg-brand py-2 text-white disabled:opacity-50">
        {loading ? "Creating…" : "Register"}
      </button>
    </form>
  );
}
