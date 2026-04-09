"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearAuth,
  fetchWithAuth,
  isAuthErrorMessage,
  isForbiddenMessage,
  loginRedirectUrl
} from "../../../utils/api";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setUsers(await fetchWithAuth("/admin/users"));
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(loginRedirectUrl());
      return;
    }
    load().catch((e) => {
      const msg = e.message || "Could not load users.";
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
  }, [router]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Users</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="overflow-x-auto rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Area</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.full_name}</td>
                <td className="py-2">{u.phone}</td>
                <td className="py-2 text-gray-600">{u.email || "—"}</td>
                <td className="py-2">{u.role}</td>
                <td className="py-2">{u.area_name || "-"}</td>
                <td className="py-2">{u.is_active ? "active" : "inactive"}</td>
                <td className="py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-3 text-gray-500">No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
