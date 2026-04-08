"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function readToken() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setLogged(readToken());
  }, [pathname]);

  useEffect(() => {
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

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="container-x flex items-center justify-between py-3">
        <Link href="/" className="text-lg font-bold text-brand">Ishaka Market Hub</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/post-listing">Post</Link>
          <Link href="/apply-seller">Apply Seller</Link>
          <Link href="/admin">Admin</Link>
          {logged ? <Link href="/notifications">Notifications</Link> : null}
          {!logged ? (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          ) : (
            <button type="button" className="text-brand underline" onClick={logout}>
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
