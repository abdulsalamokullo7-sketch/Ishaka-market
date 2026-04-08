"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCart, readCart, removeFromCart, setCartQty } from "../../utils/cart";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl } from "../../utils/api";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);

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

  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setHasToken(!!localStorage.getItem("token"));
    sync();
    window.addEventListener("auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function placeOrder() {
    setCheckoutErr("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    if (items.length === 0) return;
    setCheckoutBusy(true);
    try {
      const payload = {
        items: items.map((x) => ({
          listing_id: x.id,
          qty: Number(x.qty || 1)
        }))
      };
      const res = await fetchWithAuth("/orders/checkout", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      clearCart();
      router.push(`/orders/${res.order_group_id}`);
    } catch (e) {
      const msg = e.message || "Could not place order.";
      if (isAuthErrorMessage(msg)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setCheckoutErr(msg);
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Cart</h1>
        <Link href="/orders" className="text-sm font-medium text-brand underline">
          My orders
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Your cart is empty.</p>
          <Link href="/" className="mt-2 inline-block rounded-full bg-brand px-4 py-2 text-sm text-white">
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((x) => (
              <div key={x.id} className="rounded bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={x.image || ""} alt={x.title} className="h-16 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <Link href={`/listing/${x.id}`} className="font-medium text-brand hover:underline">
                      {x.title}
                    </Link>
                    <p className="text-sm text-gray-600">{Number(x.price).toLocaleString()} UGX</p>
                  </div>
                  <select
                    className="rounded border bg-white p-1 text-base sm:text-sm"
                    value={Math.min(99, Number(x.qty || 1))}
                    onChange={(e) => setCartQty(x.id, Number(e.target.value))}
                  >
                    {Array.from(
                      { length: Math.min(99, Math.max(30, Number(x.qty || 1))) },
                      (_, i) => i + 1
                    ).map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                    onClick={() => removeFromCart(x.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-lg font-bold">Total: {Number(total).toLocaleString()} UGX</p>
            <p className="mt-1 text-xs text-gray-600">
              Ordering saves this request to your account. Arrange payment and delivery with each seller (WhatsApp / call).
            </p>

            {checkoutErr ? <p className="mt-2 text-sm text-red-600">{checkoutErr}</p> : null}

            {!mounted ? (
              <p className="mt-3 text-center text-sm text-gray-500">Checking account...</p>
            ) : !hasToken ? (
              <Link
                href={loginRedirectUrl()}
                className="mt-3 inline-block w-full rounded-full bg-brand py-2.5 text-center text-sm font-semibold text-white"
              >
                Log in to place order
              </Link>
            ) : (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={placeOrder}
                className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {checkoutBusy ? "Placing order..." : "Place order"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
