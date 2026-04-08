"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

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

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">Buy, Sell, Rent and Deliver in Ishaka</h1>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className="rounded-full border p-2.5 text-sm" placeholder="Search products/services..." value={query.q} onChange={(e) => setQuery({ ...query, q: e.target.value })} />
          <select className="rounded-full border p-2.5 text-sm" value={query.category_id} onChange={(e) => setQuery({ ...query, category_id: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="rounded-full border p-2.5 text-sm" value={query.area_id} onChange={(e) => setQuery({ ...query, area_id: e.target.value })}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button className="mt-2 rounded-full bg-brand px-4 py-2 text-white" onClick={load}>Search</button>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && listings.length === 0 ? (
          <p className="text-sm text-gray-500">Loading products...</p>
        ) : null}
        {listings.map((l) => (
          <Link key={l.id} href={`/listing/${l.id}`} className="rounded-2xl bg-white p-3 shadow-sm transition hover:shadow">
            <div className="grid grid-cols-2 gap-2">
              <img src={l.image_urls?.[0]} alt={l.title} loading="lazy" className="h-32 w-full rounded-xl object-cover" />
              <img src={l.image_urls?.[1] || l.image_urls?.[0]} alt={`${l.title} preview`} loading="lazy" className="h-32 w-full rounded-xl object-cover" />
            </div>
            <h3 className="mt-2 font-semibold">{l.title}</h3>
            <p className="text-sm text-gray-600">{l.area_name}</p>
            <p className="font-bold text-brand">{Number(l.price).toLocaleString()} UGX</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
