"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function ListingDetails({ params }) {
  const [item, setItem] = useState(null);
  const [areas, setAreas] = useState([]);
  const [toArea, setToArea] = useState("");
  const [fare, setFare] = useState(null);

  useEffect(() => {
    api(`/listings/${params.id}`).then(setItem);
    api("/areas").then(setAreas);
  }, [params.id]);

  async function calculate() {
    if (!item || !toArea) return;
    const data = await api("/delivery/calculate", {
      method: "POST",
      body: JSON.stringify({ from_area_id: item.area_id, to_area_id: toArea })
    });
    setFare(data);
  }

  if (!item) return <p>Loading...</p>;
  const whatsapp = item.whatsapp_number || item.seller_phone;
  return (
    <div className="space-y-4">
      <img src={item.image_urls?.[0]} alt={item.title} className="h-60 w-full rounded-xl object-cover" />
      <h1 className="text-xl font-bold">{item.title}</h1>
      <p className="text-gray-700">{item.description}</p>
      <p className="text-2xl font-bold text-brand">{Number(item.price).toLocaleString()} UGX</p>
      <p>Seller: {item.seller_name} {item.is_verified ? "Verified" : "New Seller"}</p>
      <div className="flex gap-2">
        <a className="rounded bg-green-600 px-4 py-2 text-white" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank">WhatsApp</a>
        <a className="rounded bg-gray-800 px-4 py-2 text-white" href={`tel:${item.seller_phone}`}>Call</a>
      </div>

      <div className="rounded-xl bg-white p-3 shadow-sm">
        <h2 className="font-semibold">Request Delivery</h2>
        <select className="mt-2 w-full rounded border p-2" value={toArea} onChange={(e) => setToArea(e.target.value)}>
          <option value="">Select your area</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="mt-2 rounded bg-brand px-4 py-2 text-white" onClick={calculate}>Calculate Fare</button>
        {fare ? <p className="mt-2">Distance: {fare.distance_km} km | Fare: {Number(fare.fare_ugx).toLocaleString()} UGX</p> : null}
      </div>
    </div>
  );
}
