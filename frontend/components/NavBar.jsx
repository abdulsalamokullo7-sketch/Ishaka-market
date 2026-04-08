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

function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-50 text-brand shadow-sm ring-1 ring-emerald-100"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

function BottomIcon({ name }) {
  const c = "h-5 w-5 shrink-0 stroke-[1.75]";
  if (name === "home") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (name === "login") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    );
  }
  if (name === "spark") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    );
  }
  return null;
}

function BottomItem({ href, label, active, badge, icon }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px] ${
        active ? "bg-emerald-50 text-brand shadow-sm ring-1 ring-emerald-100/80" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <BottomIcon name={icon} />
      <span className="max-w-[4.5rem] truncate text-center">
        {label}
        {badge != null && badge !== "" ? badge : ""}
      </span>
    </Link>
  );
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

  const desktopNav = (
    <>
      <NavLink href="/" active={isActive("/")}>
        Home
      </NavLink>
      <NavLink href="/post-listing" active={isActive("/post-listing")}>
        Post
      </NavLink>
      <NavLink href="/cart" active={isActive("/cart")}>
        Cart ({count})
      </NavLink>
      {logged ? <NavLink href="/orders" active={isActive("/orders")}>Orders</NavLink> : null}
      {!logged || role === "user" ? (
        <NavLink href="/apply-seller" active={isActive("/apply-seller")}>
          Apply Seller
        </NavLink>
      ) : null}
      {logged && role === "seller" ? (
        <NavLink href="/seller-account" active={isActive("/seller-account")}>
          My Account
        </NavLink>
      ) : null}
      <NavLink href="/admin" active={isActive("/admin")}>
        Admin
      </NavLink>
      {logged ? <NavLink href="/notifications" active={isActive("/notifications")}>Notifications</NavLink> : null}
      {logged === false ? (
        <>
          <NavLink href="/login" active={isActive("/login")}>
            Login
          </NavLink>
          <Link
            href="/register"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800"
          >
            Register
          </Link>
        </>
      ) : logged ? (
        <button
          type="button"
          className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700"
          onClick={logout}
        >
          Log out
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-emerald-100/90 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="container-x flex items-center justify-center py-3 md:py-3.5">
          <Link href="/" className="group flex max-w-full items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-800 text-white shadow-md shadow-emerald-900/15 ring-1 ring-white/20 transition group-hover:shadow-lg group-hover:shadow-emerald-900/20"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-bold tracking-tight text-gray-900 transition group-hover:text-brand md:text-xl">
                Ishaka Market Hub
              </span>
              <span className="hidden text-xs font-medium text-gray-500 sm:block">Buy, sell &amp; deliver locally</span>
            </span>
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100/90 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg">
        {/* Mobile: icon strip */}
        <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            <BottomItem href="/" label="Home" icon="home" active={isActive("/")} />
            <BottomItem href="/post-listing" label="Post" icon="plus" active={isActive("/post-listing")} />
            {logged && role === "seller" ? (
              <BottomItem href="/seller-account" label="Account" icon="user" active={isActive("/seller-account")} />
            ) : (
              <BottomItem href="/apply-seller" label="Apply" icon="user" active={isActive("/apply-seller")} />
            )}
            {logged ? (
              <BottomItem href="/cart" label="Cart" icon="cart" active={isActive("/cart")} badge={count ? ` ${count}` : ""} />
            ) : (
              <BottomItem href="/login" label="Login" icon="login" active={isActive("/login")} />
            )}
            {logged ? (
              <button
                type="button"
                className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold leading-tight text-red-600 transition-colors hover:bg-red-50 sm:text-[11px]"
                onClick={logout}
              >
                <svg className="h-5 w-5 shrink-0 stroke-[1.75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            ) : (
              <BottomItem href="/register" label="Join" icon="spark" active={isActive("/register")} />
            )}
          </div>
        </div>

        {/* Desktop / tablet: same links as before, bottom-aligned */}
        <div className="container-x hidden max-h-[min(40vh,100%)] flex-wrap items-center justify-center gap-1 overflow-y-auto py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:flex">
          {desktopNav}
        </div>
      </nav>
    </>
  );
}
