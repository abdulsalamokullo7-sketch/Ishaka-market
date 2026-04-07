"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const [areas, setAreas] = useState([]);
  const [areasErr, setAreasErr] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", password: "", area_id: "" });
  const router = useRouter();

  useEffect(() => {
    api("/areas")
      .then(setAreas)
      .catch(() => setAreasErr("Could not load areas. Check API URL and try again."));
  }, []);

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
      router.push("/");
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

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Create account</h1>
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
      <input
        className="w-full rounded border p-2"
        type="password"
        placeholder="Password (min 6 characters)"
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
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
