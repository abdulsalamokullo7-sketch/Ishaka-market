"use client";
import { useEffect, useState } from "react";
import { addToCart, decrementFromCart, getCartQty } from "../utils/cart";

/**
 * +/- stepper for a product line. Syncs with localStorage cart and cart-change events.
 */
export default function CartQtyControls({ item, size = "default", disabled = false }) {
  const [qty, setQty] = useState(0);

  useEffect(() => {
    function sync() {
      setQty(getCartQty(item.id));
    }
    sync();
    window.addEventListener("cart-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id]);

  const isSm = size === "sm";
  const btn = isSm ? "h-8 min-w-[2rem] text-base" : "h-10 min-w-[2.5rem] text-lg";
  const pad = isSm ? "p-0.5" : "p-1";

  if (disabled) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isSm ? "py-1 text-[10px]" : "text-sm"}`}
      >
        Sold
      </span>
    );
  }

  function plus(e) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(item);
  }
  function minus(e) {
    e.preventDefault();
    e.stopPropagation();
    decrementFromCart(item.id);
  }

  return (
    <div
      className={`inline-flex max-w-full items-center justify-center gap-0.5 rounded-full border border-gray-200 bg-white shadow-sm ${pad}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={qty <= 0}
        onClick={minus}
        className={`flex items-center justify-center rounded-full font-semibold text-brand transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 ${btn}`}
      >
        −
      </button>
      <span className={`min-w-[2rem] text-center font-semibold tabular-nums text-gray-900 ${isSm ? "text-xs" : "text-sm"}`}>
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={plus}
        className={`flex items-center justify-center rounded-full font-semibold text-brand transition hover:bg-gray-100 ${btn}`}
      >
        +
      </button>
    </div>
  );
}
