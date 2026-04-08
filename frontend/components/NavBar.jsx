"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncAuthSession } from "../utils/api";
import { cartCount } from "../utils/cart";

function readToken() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logged, setLogged] = useState(null);
  const [role, setRole] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setLogged(readToken());
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      setRole(raw ? JSON.parse(raw)?.role || "" : "");
    } catch {
      setRole("");
    }
  }, [pathname]);

  useEffect(() => {
    if (readToken()) {
      syncAuthSession()
        .then((u) => setRole(u?.role || ""))
        .catch(() => null);
    }
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "user" || e.key === null) {
        setLogged(readToken());
        try {
          const raw = localStorage.getItem("user");
          setRole(raw ? JSON.parse(raw)?.role || "" : "");
        } catch {
          setRole("");
        }
      }
    };
    const onAuth = () => {
      setLogged(readToken());
      try {
        const raw = localStorage.getItem("user");
        setRole(raw ? JSON.parse(raw)?.role || "" : "");
      } catch {
        setRole("");
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-change", onAuth);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-change", onAuth);
    };
  }, []);

  useEffect(() => {
    const refresh = () => setCount(cartCount());
    refresh();
    window.addEventListener("cart-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cart-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLogged(false);
    setRole("");
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
    router.refresh();
  }

  function isActive(path) {
    if (!pathname) return false;
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  }

  const navLinks = (
    <>
      <Link href="/post-listing" className="rounded-full px-3 py-2 hover:bg-gray-100">Post</Link>
      <Link href="/cart" className="rounded-full px-3 py-2 hover:bg-gray-100">Cart ({count})</Link>
      {!logged || role === "user" ? <Link href="/apply-seller" className="rounded-full px-3 py-2 hover:bg-gray-100">Apply Seller</Link> : null}
      {logged && role === "seller" ? <Link href="/seller-account" className="rounded-full px-3 py-2 hover:bg-gray-100">My Account</Link> : null}
      <Link href="/admin" className="rounded-full px-3 py-2 hover:bg-gray-100">Admin</Link>
      {logged ? <Link href="/notifications" className="rounded-full px-3 py-2 hover:bg-gray-100">Notifications</Link> : null}
      {logged === false ? (
        <>
          <Link href="/login" className="rounded-full px-3 py-2 hover:bg-gray-100">Login</Link>
          <Link href="/register" className="rounded-full bg-brand px-3 py-2 text-white">Register</Link>
        </>
      ) : logged ? (
        <button type="button" className="rounded-full px-3 py-2 text-brand underline" onClick={logout}>
          Log out
        </button>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="container-x flex items-center justify-between py-2.5">
        <Link href="/" className="text-lg font-bold text-brand">Ishaka Market Hub</Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">{navLinks}</nav>
        <div className="text-xs text-gray-500 md:hidden">Mobile</div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2 text-[11px]">
          <Link href="/" className={`rounded-xl px-2 py-2 text-center ${isActive("/") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Home</Link>
          <Link href="/post-listing" className={`rounded-xl px-2 py-2 text-center ${isActive("/post-listing") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Post</Link>
          {logged && role === "seller" ? (
            <Link href="/seller-account" className={`rounded-xl px-2 py-2 text-center ${isActive("/seller-account") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Account</Link>
          ) : (
            <Link href="/apply-seller" className={`rounded-xl px-2 py-2 text-center ${isActive("/apply-seller") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Apply</Link>
          )}
          {logged ? (
            <Link href="/cart" className={`rounded-xl px-2 py-2 text-center ${isActive("/cart") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Cart {count ? `(${count})` : ""}</Link>
          ) : (
            <Link href="/login" className={`rounded-xl px-2 py-2 text-center ${isActive("/login") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Login</Link>
          )}
          {logged ? (
            <button type="button" className="rounded-xl px-2 py-2 text-center text-red-600" onClick={logout}>Logout</button>
          ) : (
            <Link href="/register" className={`rounded-xl px-2 py-2 text-center ${isActive("/register") ? "bg-gray-100 font-semibold text-brand" : "text-gray-700"}`}>Join</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
