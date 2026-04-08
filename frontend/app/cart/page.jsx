"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCart, removeFromCart, setCartQty } from "../../utils/cart";

export default function CartPage() {
  const [items, setItems] = useState([]);

  function refresh() {
    setItems(readCart());
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("cart-change", onChange);
    return () => window.removeEventListener("cart-change", onChange);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.qty || 1), 0),
    [items]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Cart</h1>
      {items.length === 0 ? (
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Your cart is empty.</p>
          <Link href="/" className="mt-2 inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">Browse products</Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((x) => (
              <div key={x.id} className="rounded bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={x.image || ""} alt={x.title} className="h-16 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{x.title}</p>
                    <p className="text-sm text-gray-600">{Number(x.price).toLocaleString()} UGX</p>
                  </div>
                  <select
                    className="rounded border p-1 text-sm"
                    value={x.qty}
                    onChange={(e) => setCartQty(x.id, Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <button type="button" className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => removeFromCart(x.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-lg font-bold">Total: {Number(total).toLocaleString()} UGX</p>
          </div>
        </>
      )}
    </div>
  );
}
