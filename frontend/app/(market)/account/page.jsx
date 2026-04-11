"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../../../utils/api";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace(loginRedirectUrl("/account"));
      return;
    }
    (async () => {
      try {
        const u = await syncAuthSession();
        if (u) {
          setUser(u);
          return;
        }
        if (typeof window !== "undefined" && localStorage.getItem("token")) {
          clearAuth();
          router.replace(loginRedirectUrl("/account"));
          return;
        }
        setErr("Could not load your account.");
      } catch (e) {
        const msg = e.message || "";
        if (isAuthErrorMessage(msg)) {
          clearAuth();
          router.replace(loginRedirectUrl("/account"));
          return;
        }
        setErr(msg || "Could not load your account.");
      }
    })();
  }, [router]);

  function logout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  if (!user && !err) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">My account</h1>
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  const role = user?.role || "";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">My account</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">{user?.full_name || "—"}</p>
        <p className="text-sm text-gray-600">Phone: {user?.phone || "—"}</p>
        <p className="text-sm text-gray-600">
          Role: <span className="font-medium capitalize">{role || "—"}</span>
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100"
        >
          Log out
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Shortcuts</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/orders" className="font-medium text-brand underline-offset-2 hover:underline">
              My orders
            </Link>
          </li>
          <li>
            <Link href="/messages" className="font-medium text-brand underline-offset-2 hover:underline">
              Messages
            </Link>
          </li>
          <li>
            <Link href="/notifications" className="font-medium text-brand underline-offset-2 hover:underline">
              Alerts
            </Link>
          </li>
          <li>
            <Link href="/cart" className="font-medium text-brand underline-offset-2 hover:underline">
              Cart
            </Link>
          </li>
          {role === "seller" ? (
            <li>
              <Link href="/seller-account" className="font-medium text-brand underline-offset-2 hover:underline">
                Seller dashboard &amp; listings
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/apply-seller" className="font-medium text-brand underline-offset-2 hover:underline">
                Apply to sell
              </Link>
            </li>
          )}
          <li>
            <Link href="/admin" className="font-medium text-brand underline-offset-2 hover:underline">
              Admin
            </Link>
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-gray-500">
        Need another account?{" "}
        <Link href="/register" className="text-brand underline">
          Register
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-brand underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
