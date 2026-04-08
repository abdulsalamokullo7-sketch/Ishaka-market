"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function ListingDetails({ params }) {
  const [item, setItem] = useState(null);
  const [areas, setAreas] = useState([]);
  const [toArea, setToArea] = useState("");
  const [fare, setFare] = useState(null);
  const [fareErr, setFareErr] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    api(`/listings/${params.id}`).then(setItem);
    api("/areas").then(setAreas);
  }, [params.id]);

  async function calculate() {
    if (!item || !toArea) return;
    setFareErr("");
    setFare(null);
    try {
      const data = await api("/delivery/calculate", {
        method: "POST",
        body: JSON.stringify({ from_area_id: item.area_id, to_area_id: toArea })
      });
      setFare(data);
    } catch (e) {
      setFareErr(e.message || "Could not calculate fare right now.");
    }
  }

  if (!item) return <p>Loading...</p>;
  const images = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : [];
  const whatsapp = item.whatsapp_number || item.seller_phone;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
          <div
            data-gallery
            className="flex snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActiveIdx(Math.round(e.currentTarget.scrollLeft / w));
            }}
          >
            {images.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt={`${item.title} ${i + 1}`}
                className="h-72 w-full min-w-full snap-center object-cover"
                onLoad={() => {
                  if (i === 0 && activeIdx !== 0) setActiveIdx(0);
                }}
              />
            ))}
          </div>
        </div>
        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={`thumb-${src}-${i}`}
                type="button"
                onClick={() => {
                  const container = document.querySelector("[data-gallery]");
                  if (container) container.scrollTo({ left: i * container.clientWidth, behavior: "smooth" });
                  setActiveIdx(i);
                }}
                className={`h-14 w-20 overflow-hidden rounded-lg border ${activeIdx === i ? "border-brand" : "border-gray-200"}`}
              >
                <img src={src} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <h1 className="text-xl font-bold">{item.title}</h1>
      <p className="text-gray-700">{item.description}</p>
      <p className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-700">
        Condition: {item.condition || "used"}
      </p>
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
        {fareErr ? <p className="mt-2 text-sm text-amber-700">{fareErr}</p> : null}
        {fare ? <p className="mt-2">Distance: {fare.distance_km} km | Fare: {Number(fare.fare_ugx).toLocaleString()} UGX</p> : null}
      </div>
    </div>
  );
}
