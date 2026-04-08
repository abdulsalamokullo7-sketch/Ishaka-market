"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { addToCart } from "../../../../utils/cart";

export default function SellerPage({ params }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/sellers/${params.id}/listings?limit=20`).then(setData);
  }, [params.id]);
  if (!data) return <p>Loading...</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{data.seller.full_name}</h1>
      <div className="flex gap-2">
        <a className="rounded bg-green-600 px-4 py-2 text-white" href={`https://wa.me/${(data.seller.whatsapp_number || data.seller.phone).replace(/\D/g, "")}`}>WhatsApp</a>
        <a className="rounded bg-gray-800 px-4 py-2 text-white" href={`tel:${data.seller.phone}`}>Call</a>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.data.map((l) => (
          <article key={l.id} className="rounded bg-white p-3 shadow">
            <Link href={`/listing/${l.id}`} className="block">
              <h3 className="font-semibold">{l.title}</h3>
              <p>{Number(l.price).toLocaleString()} UGX</p>
            </Link>
            <button
              type="button"
              className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs text-white"
              onClick={() => addToCart({ id: l.id, title: l.title, price: Number(l.price || 0), image: l.image_urls?.[0] || "" })}
            >
              Add to Cart
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
