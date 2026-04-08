"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import CartQtyControls from "../components/CartQtyControls";

const HOME_CACHE_KEY = "home-cache-v1";

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [query, setQuery] = useState({ q: "", category_id: "", area_id: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [l, c, a] = await Promise.all([
      api(`/listings?limit=20&q=${encodeURIComponent(query.q)}&category_id=${query.category_id}&area_id=${query.area_id}`),
      api("/categories"),
      api("/areas")
    ]);
    setListings(l.data);
    setCategories(c);
    setAreas(a);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ listings: l.data, categories: c, areas: a }));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(HOME_CACHE_KEY);
      if (raw) {
        try {
          const cache = JSON.parse(raw);
          setListings(Array.isArray(cache.listings) ? cache.listings : []);
          setCategories(Array.isArray(cache.categories) ? cache.categories : []);
          setAreas(Array.isArray(cache.areas) ? cache.areas : []);
          setLoading(false);
        } catch {
          // Ignore bad cache.
        }
      }
    }
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query.q, query.category_id, query.area_id]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">Buy, Sell, Rent and Deliver in Ishaka</h1>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className="rounded-full border p-2.5 text-sm" placeholder="Search products/services..." value={query.q} onChange={(e) => setQuery({ ...query, q: e.target.value })} />
          <select className="relative z-20 rounded-full border bg-white p-2.5 text-base sm:text-sm" value={query.category_id} onChange={(e) => setQuery({ ...query, category_id: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="relative z-20 rounded-full border bg-white p-2.5 text-base sm:text-sm" value={query.area_id} onChange={(e) => setQuery({ ...query, area_id: e.target.value })}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="rounded-full bg-brand px-4 py-2 text-white" onClick={load}>Search</button>
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-sm"
            onClick={() => setQuery({ q: "", category_id: "", area_id: "" })}
          >
            Clear
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {loading && listings.length === 0 ? (
          <p className="text-sm text-gray-500">Loading products...</p>
        ) : null}
        {listings.map((l) => (
          <article key={l.id} className="rounded-2xl bg-white p-2.5 shadow-sm transition hover:shadow">
            <Link href={`/listing/${l.id}`} className="block">
              <div className="grid grid-cols-2 gap-2">
                <img src={l.image_urls?.[0]} alt={l.title} loading="lazy" className="h-32 w-full rounded-xl object-cover" />
                <img src={l.image_urls?.[1] || l.image_urls?.[0]} alt={`${l.title} preview`} loading="lazy" className="h-32 w-full rounded-xl object-cover" />
              </div>
              <h3 className="mt-2 line-clamp-1 text-sm font-semibold sm:text-base">{l.title}</h3>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-xs text-gray-600 sm:text-sm">{l.area_name}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-700 sm:text-xs">{l.condition || "used"}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-brand sm:text-base">{Number(l.price).toLocaleString()} UGX</p>
            </Link>
            <div className="mt-2 flex justify-center">
              <CartQtyControls
                size="sm"
                item={{ id: l.id, title: l.title, price: Number(l.price || 0), image: l.image_urls?.[0] || "" }}
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
