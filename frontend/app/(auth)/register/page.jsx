"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({ full_name: "", phone: "", password: "", area_id: "" });
  const router = useRouter();
  useEffect(() => { api("/areas").then(setAreas); }, []);

  async function submit(e) {
    e.preventDefault();
    const data = await api("/auth/register", { method: "POST", body: JSON.stringify(form) });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    router.push("/");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded bg-white p-4 shadow">
      <h1 className="text-xl font-bold">Create account</h1>
      <input className="w-full rounded border p-2" placeholder="Full name" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="w-full rounded border p-2" type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
        <option value="">Select area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button className="w-full rounded bg-brand py-2 text-white">Register</button>
    </form>
  );
}
