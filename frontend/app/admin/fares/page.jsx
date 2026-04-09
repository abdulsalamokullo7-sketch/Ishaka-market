"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminFaresPage() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [fares, setFares] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ from_area_id: "", to_area_id: "", distance_km: "", fare_ugx: "" });
  async function load() {
    const [a, f] = await Promise.all([api("/areas"), fetchWithAuth("/admin/delivery-fares")]);
    setAreas(a);
    setFares(f);
  }
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load().catch((e) => {
      const msg = e.message || "Could not load fares.";
      if (isAuthErrorMessage(msg)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      if (isForbiddenMessage(msg)) {
        setErr("Admin access only. Log in with an admin account.");
        return;
      }
      setErr(msg);
    });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await fetchWithAuth("/admin/delivery-fares", { method: "POST", body: JSON.stringify({ ...form, distance_km: Number(form.distance_km), fare_ugx: Number(form.fare_ugx) }) });
      setMsg("Fare saved.");
      load();
    } catch (e2) {
      const msg2 = e2.message || "Failed to save fare.";
      if (isAuthErrorMessage(msg2)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      if (isForbiddenMessage(msg2)) {
        setErr("Admin access only. Log in with an admin account.");
        return;
      }
      setErr(msg2);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="max-w-lg space-y-3 rounded bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Transport Fare Management</h1>
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, from_area_id: e.target.value })}>
        <option value="">From Area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, to_area_id: e.target.value })}>
        <option value="">To Area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input type="number" className="w-full rounded border p-2" placeholder="Distance (km)" onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
      <input type="number" className="w-full rounded border p-2" placeholder="Fare (UGX)" onChange={(e) => setForm({ ...form, fare_ugx: e.target.value })} />
        {msg ? <p className="text-green-700">{msg}</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button className="w-full rounded bg-brand py-2 text-white">Save Fare</button>
      </form>
      <div className="rounded bg-white p-4 shadow">
        {fares.map((f) => (
          <p key={f.id}>{f.from_area_name} to {f.to_area_name}: {Number(f.distance_km)}km - {Number(f.fare_ugx).toLocaleString()} UGX</p>
        ))}
      </div>
    </div>
  );
}
