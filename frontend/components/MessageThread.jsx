"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, fetchWithAuth, isAuthErrorMessage, loginRedirectUrl, syncAuthSession } from "../utils/api";

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function normId(v) {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}

/**
 * @param {object} props
 * @param {string} props.listingId
 * @param {string} props.sellerUserId
 * @param {string} props.sellerName
 * @param {string} [props.initialPeer] - when set (e.g. from URL), locks peer for this thread
 * @param {object} [props.listing] - product card: { id, title, price, image_urls, condition }
 * @param {boolean} [props.showProductCard]
 * @param {boolean} [props.embedded] - tighter padding when embedded (unused; kept for API compat)
 */
export default function MessageThread({
  listingId,
  sellerUserId,
  sellerName,
  initialPeer = "",
  listing = null,
  showProductCard = false
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [partners, setPartners] = useState([]);
  const [peerUserId, setPeerUserId] = useState(initialPeer || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const bottomRef = useRef(null);

  const isSeller = Boolean(user?.id && sellerUserId && normId(user.id) === normId(sellerUserId));

  useEffect(() => {
    setMounted(true);
    setUser(readUser());
    syncAuthSession()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => null);
    const sync = () => setUser(readUser());
    window.addEventListener("auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!isSeller || !listingId || !mounted) return;
    function loadPartners(silent) {
      return fetchWithAuth(`/messages/partners?listing_id=${encodeURIComponent(listingId)}`)
        .then(setPartners)
        .catch((e) => {
          if (isAuthErrorMessage(e.message)) {
            clearAuth();
            router.push(loginRedirectUrl());
            return;
          }
          if (!silent) setErr(e.message || "Could not load buyers");
        });
    }
    loadPartners(false);
    const pollPartners = setInterval(() => loadPartners(true), 8000);
    return () => clearInterval(pollPartners);
  }, [isSeller, listingId, mounted, router]);

  useEffect(() => {
    if (initialPeer) {
      setPeerUserId(initialPeer);
      return;
    }
    if (!sellerUserId) return;
    if (!isSeller) {
      setPeerUserId(sellerUserId);
      return;
    }
    if (partners.length && !peerUserId) {
      setPeerUserId(partners[0].id);
    }
  }, [initialPeer, isSeller, sellerUserId, partners, peerUserId]);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!listingId || !peerUserId || !user) return;
      if (!silent) setLoading(true);
      if (!silent) setErr("");
      try {
        const rows = await fetchWithAuth(
          `/messages?listing_id=${encodeURIComponent(listingId)}&peer_user_id=${encodeURIComponent(peerUserId)}`
        );
        setMessages(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (isAuthErrorMessage(e.message)) {
          clearAuth();
          router.push(loginRedirectUrl());
          return;
        }
        if (!silent) setErr(e.message || "Could not load messages");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [listingId, peerUserId, user, router]
  );

  useEffect(() => {
    if (!mounted || !user || !peerUserId) return;
    loadMessages(false);
    const id = setInterval(() => loadMessages(true), 5000);
    return () => clearInterval(id);
  }, [mounted, user, peerUserId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !peerUserId || !user) return;
    setSending(true);
    setErr("");
    try {
      const msg = await fetchWithAuth("/messages", {
        method: "POST",
        body: JSON.stringify({
          listing_id: listingId,
          peer_user_id: peerUserId,
          body: trimmed
        })
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
      if (isSeller) {
        fetchWithAuth(`/messages/partners?listing_id=${encodeURIComponent(listingId)}`)
          .then(setPartners)
          .catch(() => null);
      }
    } catch (e) {
      if (isAuthErrorMessage(e.message)) {
        clearAuth();
        router.push(loginRedirectUrl());
        return;
      }
      setErr(e.message || "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Messages</h2>
        <p className="mt-1 text-sm text-gray-600">Log in to send messages about listings.</p>
        <Link
          href={loginRedirectUrl()}
          className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Log in
        </Link>
      </div>
    );
  }

  const img = listing?.image_urls?.[0] || listing?.image_urls?.[1];

  return (
    <div className="space-y-4">
      {showProductCard && listing ? (
        <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
          {img ? (
            <img src={img} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">No image</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">About this product</p>
            <Link href={`/listing/${listing.id}`} className="font-semibold text-brand hover:underline">
              {listing.title}
            </Link>
            <p className="text-sm text-gray-600">
              {Number(listing.price || 0).toLocaleString()} UGX · {(listing.condition || "used").toString()}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Conversation</h2>
          <span className="text-xs text-gray-500">Updates every few seconds</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {isSeller
            ? `You are the seller. Replying to buyers about “${sellerName}”.`
            : `Messaging ${sellerName} about this listing.`}
        </p>

        {isSeller ? (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500">Buyer</label>
            {partners.length === 0 ? (
              <p className="mt-1 text-sm text-amber-800">No buyers yet. When someone messages you, they appear here.</p>
            ) : (
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-base"
                value={peerUserId}
                onChange={(e) => setPeerUserId(e.target.value)}
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || "Buyer"}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}

        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}

        {peerUserId ? (
          <>
            <div className="mt-3 max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto rounded-xl bg-gray-50 p-3">
              {loading && messages.length === 0 ? (
                <p className="text-sm text-gray-500">Loading messages...</p>
              ) : null}
              {!loading && messages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet. Say hello.</p>
              ) : null}
              {messages.map((m) => {
                const mine = normId(m.sender_id) === normId(user.id);
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-brand text-white" : "bg-white text-gray-900 shadow-sm ring-1 ring-gray-100"
                      }`}
                    >
                      {!mine ? <p className="mb-0.5 text-[10px] font-semibold opacity-80">{m.sender_name}</p> : null}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-emerald-100" : "text-gray-400"}`}>
                        {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="mt-3 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-base"
                placeholder="Type a message…"
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          </>
        ) : isSeller ? (
          <p className="mt-3 text-sm text-gray-500">Select a buyer once they have contacted you.</p>
        ) : null}
      </div>
    </div>
  );
}
