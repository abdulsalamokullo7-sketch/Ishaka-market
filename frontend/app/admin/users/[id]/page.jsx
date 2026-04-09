"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAuth,
  fetchWithAuth,
  getStoredUserRole,
  isAuthErrorMessage,
  isForbiddenMessage,
  loginRedirectUrl
} from "../../../../utils/api";

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [roleDraft, setRoleDraft] = useState("user");

  async function load() {
    if (!id) return;
    const res = await fetchWithAuth(`/admin/users/${id}`);
    setData(res);
    setRoleDraft(res.user?.role || "user");
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    if (getStoredUserRole() !== "admin") {
      setErr("Admin access only. Log in with an admin account.");
      return;
    }
    load().catch((e) => {
      const msg = e.message || "Could not load user.";
      if (isAuthErrorMessage(msg)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      if (isForbiddenMessage(msg)) {
        setErr("Admin access only. Log in with an admin account.");
        return;
      }
      setErr(msg);
    });
  }, [router, id]);

  async function saveRole() {
    if (!id) return;
    setErr("");
    setBusy("role");
    try {
      await fetchWithAuth(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleDraft })
      });
      await load();
    } catch (e) {
      setErr(e.message || "Could not update role.");
    } finally {
      setBusy("");
    }
  }

  async function toggleActive() {
    if (!id || !data?.user) return;
    const next = !data.user.is_active;
    setErr("");
    setBusy("active");
    try {
      await fetchWithAuth(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next })
      });
      await load();
    } catch (e) {
      setErr(e.message || "Could not update status.");
    } finally {
      setBusy("");
    }
  }

  async function deleteUser() {
    if (!id) return;
    if (!window.confirm("Permanently delete this user and their buyer orders? Listings/messages tied to their seller profile are removed by cascade. This cannot be undone.")) {
      return;
    }
    setErr("");
    setBusy("delete");
    try {
      await fetchWithAuth(`/admin/users/${id}`, { method: "DELETE" });
      router.push("/admin/users");
    } catch (e) {
      setErr(e.message || "Could not delete user.");
    } finally {
      setBusy("");
    }
  }

  if (!data && !err) return <p className="text-sm text-gray-600">Loading…</p>;
  const u = data?.user;
  const st = data?.stats;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/users" className="text-sm font-medium text-brand underline">
          ← All users
        </Link>
      </div>
      <h1 className="text-xl font-bold">User</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {u ? (
        <>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="font-semibold">{u.full_name}</p>
            <p className="text-sm text-gray-600">Phone: {u.phone}</p>
            <p className="text-sm text-gray-600">Email: {u.email || "—"}</p>
            <p className="text-sm text-gray-600">Area: {u.area_name || "—"}</p>
            <p className="text-sm text-gray-600">Role: {u.role}</p>
            <p className="text-sm text-gray-600">Account: {u.is_active ? "active" : "inactive"}</p>
            <p className="text-xs text-gray-500">Joined: {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</p>
          </div>

          {st ? (
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="font-semibold">Activity</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-700">
                <li>Orders placed: {st.orders_count ?? 0}</li>
                <li>Messages sent/received: {st.messages_count ?? 0}</li>
                <li>Seller profile: {st.seller_profile_count ? "yes" : "no"}</li>
                <li>Listings (as seller): {st.listings_count ?? 0}</li>
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold">Role</h2>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <select
                className="rounded border bg-white p-2 text-sm"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value)}
              >
                <option value="user">user</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                disabled={busy === "role" || roleDraft === u.role}
                onClick={saveRole}
                className="rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy === "role" ? "Saving…" : "Save role"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold">Account status</h2>
            <button
              type="button"
              disabled={busy === "active"}
              onClick={toggleActive}
              className="mt-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "active" ? "…" : u.is_active ? "Deactivate account" : "Activate account"}
            </button>
            <p className="mt-2 text-xs text-gray-500">Inactive users cannot log in.</p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 className="font-semibold text-red-900">Danger zone</h2>
            <button
              type="button"
              disabled={busy === "delete"}
              onClick={deleteUser}
              className="mt-2 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {busy === "delete" ? "Deleting…" : "Delete user permanently"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
