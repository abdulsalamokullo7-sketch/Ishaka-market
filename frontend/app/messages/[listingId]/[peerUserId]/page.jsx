"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import MessageThread from "../../../../components/MessageThread";
import { loginRedirectUrl } from "../../../../utils/api";

export default function MessageThreadPage({ params }) {
  const router = useRouter();
  const { listingId, peerUserId } = params;
  const [listing, setListing] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!listingId) return;
    api(`/listings/${listingId}`)
      .then(setListing)
      .catch((e) => setErr(e.message || "Could not load listing"));
  }, [listingId]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push(loginRedirectUrl());
    }
  }, [router]);

  if (err && !listing) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{err}</p>
        <Link href="/messages" className="text-brand underline">
          Back to messages
        </Link>
      </div>
    );
  }

  if (!listing) {
    return <p className="text-sm text-gray-600">Loading...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/messages" className="text-sm font-medium text-brand underline">
          ← All messages
        </Link>
        <Link href={`/listing/${listing.id}`} className="text-sm text-gray-600 underline">
          View listing
        </Link>
      </div>

      <MessageThread
        listingId={listing.id}
        sellerUserId={listing.seller_user_id}
        sellerName={listing.seller_name || "Seller"}
        initialPeer={peerUserId}
        listing={listing}
        showProductCard
      />
    </div>
  );
}
