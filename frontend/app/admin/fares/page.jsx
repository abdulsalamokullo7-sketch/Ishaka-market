"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, isForbiddenMessage, loginRedirectUrl } from "../../../utils/api";

export default function AdminFaresPage() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [fares, setFares] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState({ from_area_id: "", to_area_id: "", distance_km: "", fare_ugx: "" });

  const load = useCallback(async () => {
    const [a, f] = await Promise.all([api("/areas"), fetchWithAuth("/admin/delivery-fares")]);
    setAreas(a);
    setFares(f);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load().catch((e) => {
      const m = e.message || "Could not load fares.";
      if (isAuthErrorMessage(m)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      if (isForbiddenMessage(m)) {
        setErr("Admin access only. Log in with an admin account.");
        return;
      }
      setErr(m);
    });
  }, [router, load]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!form.from_area_id || !form.to_area_id) {
      setErr("Choose both from and to areas.");
      return;
    }
    try {
      await fetchWithAuth("/admin/delivery-fares", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          distance_km: Number(form.distance_km),
          fare_ugx: Number(form.fare_ugx)
        })
      });
      setMsg("Fare saved.");
      setForm({ from_area_id: "", to_area_id: "", distance_km: "", fare_ugx: "" });
      await load();
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

  async function updateFare(id, patch) {
    setErr("");
    setMsg("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/delivery-fares/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setMsg("Fare updated.");
      await load();
    } catch (e2) {
      const m = e2.message || "Update failed.";
      if (isAuthErrorMessage(m)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(m);
    } finally {
      setBusyId("");
    }
  }

  async function deleteFare(id, label) {
    if (!window.confirm(`Remove fare row: ${label}?`)) return;
    setErr("");
    setMsg("");
    setBusyId(id);
    try {
      await fetchWithAuth(`/admin/delivery-fares/${id}`, { method: "DELETE" });
      setMsg("Fare removed.");
      await load();
    } catch (e2) {
      const m = e2.message || "Delete failed.";
      if (isAuthErrorMessage(m)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(m);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="max-w-lg space-y-3 rounded bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Transport fare management</h1>
        <p className="text-xs text-gray-600">Create a new route fare or edit existing rows below (distance, price, active).</p>
        <select
          className="w-full rounded border p-2"
          value={form.from_area_id}
          onChange={(e) => setForm({ ...form, from_area_id: e.target.value })}
        >
          <option value="">From area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded border p-2"
          value={form.to_area_id}
          onChange={(e) => setForm({ ...form, to_area_id: e.target.value })}
        >
          <option value="">To area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step={0.01}
          className="w-full rounded border p-2"
          placeholder="Distance (km)"
          value={form.distance_km}
          onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
        />
        <input
          type="number"
          min={0}
          className="w-full rounded border p-2"
          placeholder="Fare (UGX)"
          value={form.fare_ugx}
          onChange={(e) => setForm({ ...form, fare_ugx: e.target.value })}
        />
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button type="submit" className="w-full rounded bg-brand py-2 text-white">
          Save new fare
        </button>
      </form>

      <div className="overflow-x-auto rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Existing fares</h2>
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Route</th>
              <th className="py-2 pr-2">Km</th>
              <th className="py-2 pr-2">UGX</th>
              <th className="py-2 pr-2">Active</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fares.map((f) => (
              <FareRow
                key={f.id}
                f={f}
                busy={busyId === f.id}
                onUpdate={(patch) => updateFare(f.id, patch)}
                onDelete={() => deleteFare(f.id, `${f.from_area_name} → ${f.to_area_name}`)}
              />
            ))}
          </tbody>
        </table>
        {fares.length === 0 ? <p className="mt-2 text-sm text-gray-500">No fares yet.</p> : null}
      </div>
    </div>
  );
}

function FareRow({ f, busy, onUpdate, onDelete }) {
  const [km, setKm] = useState(String(f.distance_km ?? ""));
  const [ugx, setUgx] = useState(String(f.fare_ugx ?? ""));
  const [active, setActive] = useState(Boolean(f.active));

  useEffect(() => {
    setKm(String(f.distance_km ?? ""));
    setUgx(String(f.fare_ugx ?? ""));
    setActive(Boolean(f.active));
  }, [f.id, f.distance_km, f.fare_ugx, f.active]);

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-2 align-top">
        <span className="font-medium text-gray-900">
          {f.from_area_name} → {f.to_area_name}
        </span>
      </td>
      <td className="py-2 pr-2 align-top">
        <input type="number" min={0} step={0.01} className="w-24 rounded border px-2 py-1 text-sm" value={km} onChange={(e) => setKm(e.target.value)} />
      </td>
      <td className="py-2 pr-2 align-top">
        <input type="number" min={0} className="w-28 rounded border px-2 py-1 text-sm" value={ugx} onChange={(e) => setUgx(e.target.value)} />
      </td>
      <td className="py-2 pr-2 align-top">
        <label className="inline-flex items-center gap-1 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          On
        </label>
      </td>
      <td className="py-2 align-top">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const distance_km = Number(km);
              const fare_ugx = Number(ugx);
              if (!Number.isFinite(distance_km) || !Number.isFinite(fare_ugx) || distance_km < 0 || fare_ugx < 0) {
                window.alert("Enter valid distance and fare numbers.");
                return;
              }
              onUpdate({ distance_km, fare_ugx, active });
            }}
            className="rounded bg-brand px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Update
          </button>
          <button type="button" disabled={busy} onClick={onDelete} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-50">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
