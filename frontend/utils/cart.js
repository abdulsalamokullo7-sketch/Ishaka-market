const CART_KEY = "ishaka-cart-v1";

export function readCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-change"));
}

export function clearCart() {
  writeCart([]);
}

export function addToCart(item) {
  const cart = readCart();
  const idx = cart.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    cart[idx].qty = Number(cart[idx].qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  writeCart(cart);
}

export function removeFromCart(id) {
  writeCart(readCart().filter((x) => x.id !== id));
}

export function setCartQty(id, qty) {
  const n = Number(qty);
  if (Number.isNaN(n) || n <= 0) {
    removeFromCart(id);
    return;
  }
  const cart = readCart().map((x) => (x.id === id ? { ...x, qty: n } : x));
  writeCart(cart);
}

/** Current quantity for a listing id, or 0 if not in cart. */
export function getCartQty(id) {
  const x = readCart().find((y) => y.id === id);
  return x ? Number(x.qty || 1) : 0;
}

/** Remove one unit; drops the line when quantity reaches 0. */
export function decrementFromCart(id) {
  const cart = readCart();
  const idx = cart.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const next = Number(cart[idx].qty || 1) - 1;
  if (next <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx].qty = next;
  }
  writeCart(cart);
}

export function cartCount() {
  return readCart().reduce((n, x) => n + Number(x.qty || 1), 0);
}
