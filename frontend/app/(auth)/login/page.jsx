"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { registerUrl, safeReturnPath } from "../../../utils/api";

export default function LoginPage() {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authHint, setAuthHint] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason")) setAuthHint("Please log in to continue.");
      setReturnTo(params.get("returnTo") || "");
    }
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-change"));
      const next = returnTo ? safeReturnPath(returnTo) : "";
      router.push(next || "/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Login</h1>
      {authHint ? <p className="text-sm text-amber-700">{authHint}</p> : null}
      <input className="w-full rounded border p-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <div className="space-y-1">
        <input
          className="w-full rounded border p-2"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="rounded border-gray-300" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show password
        </label>
      </div>
      <div className="rounded border bg-gray-50 p-2 text-xs text-gray-700">
        <p className="mb-2 font-medium">Admin sign in</p>
        <p>Use the admin account credentials to access admin settings.</p>
        <Link href="/admin" className="mt-2 inline-block rounded border px-2 py-1 text-xs text-brand">
          Open admin login
        </Link>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="w-full rounded bg-brand py-2 text-white">Login</button>
      <p className="text-center text-sm text-gray-600">
        New here?{" "}
        <Link href={registerUrl(safeReturnPath(returnTo))} className="font-medium text-brand underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
