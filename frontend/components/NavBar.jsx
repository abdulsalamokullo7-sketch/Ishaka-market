"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncAuthSession } from "../utils/api";

function readToken() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logged, setLogged] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLogged(readToken());
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (readToken()) {
      syncAuthSession().catch(() => null);
    }
    const onStorage = (e) => {
      if (e.key === "token" || e.key === null) setLogged(readToken());
    };
    const onAuth = () => setLogged(readToken());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-change", onAuth);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-change", onAuth);
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLogged(false);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
    router.refresh();
  }

  const navLinks = (
    <>
      <Link href="/post-listing" className="rounded-full px-3 py-2 hover:bg-gray-100">Post</Link>
      <Link href="/apply-seller" className="rounded-full px-3 py-2 hover:bg-gray-100">Apply Seller</Link>
      {logged ? <Link href="/seller-account" className="rounded-full px-3 py-2 hover:bg-gray-100">My Account</Link> : null}
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
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          Menu
        </button>
      </div>
      {menuOpen ? (
        <div className="container-x pb-3 md:hidden">
          <nav className="grid grid-cols-2 gap-2 text-sm">{navLinks}</nav>
        </div>
      ) : null}
    </header>
  );
}
