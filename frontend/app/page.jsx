"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import CartQtyControls from "../components/CartQtyControls";

const HOME_CACHE_KEY = "home-cache-v2";

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [query, setQuery] = useState({
    q: "",
    category_id: "",
    area_id: "",
    sort: "newest"
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [l, c, a] = await Promise.all([
      api(
        `/listings?limit=20&q=${encodeURIComponent(query.q)}&category_id=${query.category_id}&area_id=${query.area_id}&sort=${encodeURIComponent(query.sort)}`
      ),
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
  }, [query.q, query.category_id, query.area_id, query.sort]);

  const filterLabel = "text-[10px] font-medium uppercase tracking-wide text-gray-500";
  const filterInput = "h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-emerald-100/80 bg-white px-3 py-2.5 shadow-sm">
        <h1 className="text-lg font-bold leading-tight">Buy, Sell, Rent and Deliver in Ishaka</h1>
        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-2">
          <label className="min-w-[min(100%,10rem)] flex-[2] sm:min-w-[8rem]">
            <span className={filterLabel}>Search</span>
            <input
              className={filterInput}
              placeholder="Products…"
              value={query.q}
              onChange={(e) => setQuery({ ...query, q: e.target.value })}
            />
          </label>
          <label className="w-[calc(50%-0.25rem)] min-w-0 sm:w-auto sm:max-w-[9.5rem]">
            <span className={filterLabel}>Category</span>
            <select className={filterInput} value={query.category_id} onChange={(e) => setQuery({ ...query, category_id: e.target.value })}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="w-[calc(50%-0.25rem)] min-w-0 sm:w-auto sm:max-w-[9.5rem]">
            <span className={filterLabel}>Area</span>
            <select className={filterInput} value={query.area_id} onChange={(e) => setQuery({ ...query, area_id: e.target.value })}>
              <option value="">All</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-[1] sm:max-w-[11rem]">
            <span className={filterLabel}>Sort</span>
            <select className={filterInput} value={query.sort} onChange={(e) => setQuery({ ...query, sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="condition">Condition (new first)</option>
            </select>
          </label>
          <div className="flex shrink-0 gap-1.5 pb-0.5">
            <button type="button" className="h-8 rounded-md bg-brand px-3 text-xs font-semibold text-white" onClick={load}>
              Search
            </button>
            <button
              type="button"
              className="h-8 rounded-md border border-gray-200 px-2.5 text-xs text-gray-700"
              onClick={() => setQuery({ q: "", category_id: "", area_id: "", sort: "newest" })}
            >
              Clear
            </button>
          </div>
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
