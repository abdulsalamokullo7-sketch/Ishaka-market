"use client";
import Link from "next/link";

export default function NavBar() {
  const isLogged = typeof window !== "undefined" && !!localStorage.getItem("token");
  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="container-x flex items-center justify-between py-3">
        <Link href="/" className="text-lg font-bold text-brand">Ishaka Market Hub</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/post-listing">Post</Link>
          <Link href="/apply-seller">Apply Seller</Link>
          <Link href="/admin">Admin</Link>
          {!isLogged ? <Link href="/login">Login</Link> : null}
        </nav>
      </div>
    </header>
  );
}
