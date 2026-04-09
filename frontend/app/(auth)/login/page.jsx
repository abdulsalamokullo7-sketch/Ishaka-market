"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { registerUrl, safeReturnPath } from "../../../utils/api";

export default function LoginPage() {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [authHint, setAuthHint] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
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
      <input className="w-full rounded border p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="rounded border bg-gray-50 p-2 text-xs text-gray-700">
        <p className="mb-2 font-medium">Admin sign in</p>
        <p>Use the same login form with your admin account credentials.</p>
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
