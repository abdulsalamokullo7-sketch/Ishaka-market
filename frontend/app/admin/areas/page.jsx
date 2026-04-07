"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function AdminAreasPage() {
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState("");
  async function load() { setAreas(await api("/areas")); }
  useEffect(() => { load(); }, []);
  async function submit(e) {
    e.preventDefault();
    await api("/admin/areas", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
  }
  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="rounded bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Area Management</h1>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded border p-2" placeholder="New area name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="rounded bg-brand px-4 text-white">Save</button>
        </div>
      </form>
      <div className="rounded bg-white p-4 shadow">
        {areas.map((a) => <p key={a.id}>{a.name}</p>)}
      </div>
    </div>
  );
}
