"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loginRedirectUrl, registerUrl, syncAuthSession } from "../utils/api";
import { normId } from "./MessageThread";

export default function ListingMessageCta({ listingId, sellerUserId, sellerName }) {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
    syncAuthSession()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => null);
  }, []);

  if (!mounted) return null;
  if (!sellerUserId) return null;

  const threadPath = `/messages/${listingId}/${sellerUserId}`;
  const threadHref = threadPath;
  const inboxForListing = `/messages?listing_id=${listingId}`;
  const isOwner = Boolean(user && normId(user.id) === normId(sellerUserId));

  if (!user) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Messages</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create a free account (name, phone, password, and area) to message {sellerName} about this product. Already have an account? Log in — we&apos;ll send you straight to this chat.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={registerUrl(threadPath)} className="inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
            Create account &amp; message
          </Link>
          <Link
            href={loginRedirectUrl(threadPath)}
            className="inline-block rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Buyer messages</h2>
        <p className="mt-1 text-sm text-gray-600">Replies to buyers for this listing are in Messages.</p>
        <Link href={inboxForListing} className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
          Open messages for this listing
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900">Messages</h2>
      <p className="mt-1 text-sm text-gray-600">Discuss this product with {sellerName} in your inbox.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={threadHref} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
          Message about this item
        </Link>
        <Link href="/messages" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
          All messages
        </Link>
      </div>
    </div>
  );
}
