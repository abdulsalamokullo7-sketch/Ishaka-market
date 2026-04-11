"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { syncAuthSessionThrottled } from "../utils/api";
import { cartCount } from "../utils/cart";

function readToken() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      className={`rounded-t-lg rounded-b-full border-t-[3px] px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-red-600 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-100"
          : "border-red-600/35 text-gray-700 hover:border-red-600/70 hover:bg-red-50/60"
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
  if (name === "messages") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (name === "admin") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
      </svg>
    );
  }
  if (name === "orders") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    );
  }
  return null;
}

function BottomItem({ href, label, active, badge, icon }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-b-2xl rounded-t-lg border-t-[3px] px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px] ${
        active
          ? "border-red-600 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-100"
          : "border-red-600/35 text-gray-700 hover:border-red-600/70 hover:bg-red-50/60"
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
      syncAuthSessionThrottled()
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
        Sell
      </NavLink>
      {logged ? <NavLink href="/orders" active={isActive("/orders")}>Orders</NavLink> : null}
      {logged ? <NavLink href="/messages" active={isActive("/messages")}>Messages</NavLink> : null}
      {!logged || role === "user" ? (
        <NavLink href="/apply-seller" active={isActive("/apply-seller")}>
          Apply Seller
        </NavLink>
      ) : null}
      {logged ? (
        <NavLink href="/account" active={isActive("/account")}>
          My Account
        </NavLink>
      ) : null}
      {role === "admin" ? (
        <NavLink href="/admin" active={isActive("/admin")}>
          Admin
        </NavLink>
      ) : null}
      {logged !== true ? (
        <>
          <NavLink href="/login" active={isActive("/login")}>
            Login
          </NavLink>
          <Link
            href="/register"
            className="rounded-t-lg rounded-b-full border-t-[3px] border-red-600 bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800"
          >
            Register
          </Link>
        </>
      ) : null}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-emerald-100/90 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="container-x flex items-center justify-between gap-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] md:py-3.5">
          <Link href="/" className="group flex min-w-0 max-w-[min(100%,calc(100%-8rem))] items-center gap-2.5 sm:gap-3 md:max-w-none">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-800 text-white shadow-md shadow-emerald-900/15 ring-1 ring-white/20 transition group-hover:shadow-lg group-hover:shadow-emerald-900/20 sm:h-10 sm:w-10"
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
              <span className="block truncate text-base font-bold tracking-tight text-gray-900 transition group-hover:text-brand sm:text-lg md:text-xl">
                Ishaka Market Hub
              </span>
              <span className="hidden text-xs font-medium text-gray-500 sm:block">Buy, sell &amp; deliver locally</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/cart"
              className={`relative flex items-center gap-1 rounded-t-lg rounded-b-full border-t-[3px] px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                isActive("/cart")
                  ? "border-red-600 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-100"
                  : "border-red-600/35 text-gray-700 hover:border-red-600/70 hover:bg-red-50/60"
              }`}
              aria-label={`Cart${count ? `, ${count} items` : ""}`}
            >
              <svg className="h-5 w-5 shrink-0 stroke-[1.75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
            {logged ? (
              <Link
                href="/notifications"
                className={`flex items-center gap-1 rounded-t-lg rounded-b-full border-t-[3px] px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                  isActive("/notifications")
                    ? "border-red-600 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-100"
                    : "border-red-600/35 text-gray-700 hover:border-red-600/70 hover:bg-red-50/60"
                }`}
              >
                <svg className="h-5 w-5 shrink-0 stroke-[1.75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="max-[380px]:hidden">Alerts</span>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg">
        {/* Mobile: icon strip */}
        <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            <BottomItem href="/" label="Home" icon="home" active={isActive("/")} />
            <BottomItem href="/post-listing" label="Sell" icon="plus" active={isActive("/post-listing")} />
            {logged ? (
              <BottomItem href="/account" label="Account" icon="user" active={isActive("/account")} />
            ) : (
              <BottomItem href="/apply-seller" label="Apply" icon="user" active={isActive("/apply-seller")} />
            )}
            {logged ? (
              <BottomItem href="/messages" label="Messages" icon="messages" active={isActive("/messages")} />
            ) : (
              <BottomItem href="/login" label="Login" icon="login" active={isActive("/login")} />
            )}
            {logged && role === "admin" ? (
              <BottomItem href="/admin" label="Admin" icon="admin" active={isActive("/admin")} />
            ) : logged ? (
              <BottomItem href="/orders" label="Orders" icon="orders" active={isActive("/orders")} />
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
