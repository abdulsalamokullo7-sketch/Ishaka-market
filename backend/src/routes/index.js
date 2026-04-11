const express = require("express");
const { randomUUID, timingSafeEqual } = require("crypto");
const bcrypt = require("bcryptjs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const pool = require("../db/pool");
const env = require("../config/env");
const { signToken } = require("../utils/jwt");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate, Joi } = require("../middleware/validate");
const { getPagination } = require("../utils/pagination");

const router = express.Router();
const uploadSignSchema = Joi.object({
  file_name: Joi.string().min(1).max(240).required(),
  content_type: Joi.string().valid("image/jpeg", "image/png", "image/webp").required()
});

const r2Enabled = Boolean(
  env.r2.endpoint &&
    env.r2.bucket &&
    env.r2.accessKeyId &&
    env.r2.secretAccessKey &&
    env.r2.publicBaseUrl
);

const s3 = r2Enabled
  ? new S3Client({
      region: "auto",
      endpoint: env.r2.endpoint,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey
      }
    })
  : null;

const registerSchema = Joi.object({
  full_name: Joi.string().min(2).max(160).required(),
  phone: Joi.string().min(8).max(40).required(),
  password: Joi.string().min(6).max(64).required(),
  area_id: Joi.string().uuid().required()
});

const loginSchema = Joi.object({
  phone: Joi.string().required(),
  password: Joi.string().required()
});

const promoteAdminSchema = Joi.object({
  phone: Joi.string().min(8).max(40).required()
});

function bootstrapKeysMatch(provided, expected) {
  const a = String(provided || "").trim();
  const b = String(expected || "").trim();
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Same logical number as 0777…, +256777…, 256777… for UNIQUE phone lookups. */
function phoneLookupVariants(phone) {
  const t = String(phone || "").trim().replace(/\s+/g, "");
  const out = new Set([t]);
  const digits = t.replace(/\D/g, "");
  if (digits.length < 9) return [...out];
  let local = digits;
  if (local.startsWith("256")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.length === 9) {
    out.add(`0${local}`);
    out.add(`+256${local}`);
    out.add(`256${local}`);
  }
  return [...out];
}

/**
 * Promote an existing user to admin (no auth). Protected by ADMIN_BOOTSTRAP_KEY in env.
 * Use on Render when you cannot open Postgres: set a long random secret, redeploy, call once with curl, then remove the env var.
 */
router.post("/auth/promote-admin", validate(promoteAdminSchema), async (req, res) => {
  const configured = env.adminBootstrapKey;
  if (!configured || configured.length < 16) {
    return res.status(503).json({
      message:
        "ADMIN_BOOTSTRAP_KEY is not set or too short (min 16 characters). Add it in Render → Environment, redeploy, then try again."
    });
  }
  const headerKey =
    req.headers["x-promote-admin-key"] ||
    req.headers["X-Promote-Admin-Key"] ||
    req.headers["x-bootstrap-key"] ||
    "";
  if (!bootstrapKeysMatch(headerKey, configured)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const variants = phoneLookupVariants(req.body.phone);
  const { rows } = await pool.query(
    `
    UPDATE users
    SET role = 'admin', is_active = TRUE, updated_at = NOW()
    WHERE phone = ANY($1::text[])
    RETURNING id, full_name, phone, role, area_id
    `,
    [variants]
  );
  if (!rows[0]) {
    return res.status(404).json({
      message: `No user found for phone "${req.body.phone}". Register that number first, or use the exact phone string stored in the database.`
    });
  }
  const token = signToken({ id: rows[0].id, role: rows[0].role });
  return res.json({
    ok: true,
    message: "User is now admin. Log in with this phone; you can remove ADMIN_BOOTSTRAP_KEY from the server after this.",
    token,
    user: rows[0]
  });
});

router.post("/auth/register", validate(registerSchema), async (req, res) => {
  const { full_name, phone, password, area_id } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (full_name, phone, password_hash, role, area_id)
    VALUES ($1,$2,$3,'user',$4)
    RETURNING id, full_name, phone, role, area_id
  `;
  try {
    const { rows } = await pool.query(query, [full_name, phone, hash, area_id]);
    const token = signToken({ id: rows[0].id, role: rows[0].role });
    return res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    return res.status(400).json({ message: "Phone already registered" });
  }
});

router.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { phone, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE phone=$1 AND is_active=TRUE", [phone]);
  if (!rows[0]) return res.status(401).json({ message: "Invalid credentials" });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });
  const token = signToken({ id: rows[0].id, role: rows[0].role });
  return res.json({
    token,
    user: {
      id: rows[0].id,
      full_name: rows[0].full_name,
      phone: rows[0].phone,
      role: rows[0].role,
      area_id: rows[0].area_id
    }
  });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, full_name, phone, role, area_id FROM users WHERE id=$1 AND is_active=TRUE",
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "User not found" });
  const token = signToken({ id: rows[0].id, role: rows[0].role });
  return res.json({ token, user: rows[0] });
});

router.get("/areas", async (_, res) => {
  const { rows } = await pool.query("SELECT * FROM areas ORDER BY name ASC");
  return res.json(rows);
});

router.get("/categories", async (_, res) => {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
  return res.json(rows);
});

router.post("/uploads/sign", requireAuth, validate(uploadSignSchema), async (req, res) => {
  if (!r2Enabled || !s3) {
    return res.status(503).json({ message: "Image upload is not configured yet." });
  }
  const fileExt = req.body.file_name.includes(".") ? req.body.file_name.split(".").pop().toLowerCase() : "";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(fileExt)
    ? fileExt
    : req.body.content_type.split("/")[1];
  const key = `listings/${req.user.id}/${Date.now()}-${randomUUID()}.${safeExt}`;
  const command = new PutObjectCommand({
    Bucket: env.r2.bucket,
    Key: key,
    ContentType: req.body.content_type
  });
  const upload_url = await getSignedUrl(s3, command, { expiresIn: 300 });
  const file_url = `${env.r2.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  return res.json({ key, upload_url, file_url });
});

router.post("/admin/areas", requireAuth, requireRole("admin"), validate(Joi.object({
  name: Joi.string().min(2).max(120).required()
})), async (req, res) => {
  const { rows } = await pool.query(
    "INSERT INTO areas (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *",
    [req.body.name]
  );
  return res.status(201).json(rows[0]);
});

router.post("/admin/categories", requireAuth, requireRole("admin"), validate(Joi.object({
  name: Joi.string().min(2).max(120).required()
})), async (req, res) => {
  const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { rows } = await pool.query(
    "INSERT INTO categories (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING *",
    [req.body.name, slug]
  );
  return res.status(201).json(rows[0]);
});

router.get("/listings", async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = ["l.approved = TRUE", "s.status = 'approved'"];
  const vals = [];
  let i = 1;

  if (req.query.q) {
    where.push(`to_tsvector('simple', l.title || ' ' || l.description) @@ plainto_tsquery('simple', $${i++})`);
    vals.push(req.query.q);
  }
  if (req.query.category_id) {
    where.push(`l.category_id = $${i++}`);
    vals.push(req.query.category_id);
  }
  if (req.query.area_id) {
    where.push(`l.area_id = $${i++}`);
    vals.push(req.query.area_id);
  }
  if (req.query.min_price) {
    where.push(`l.price >= $${i++}`);
    vals.push(req.query.min_price);
  }
  if (req.query.max_price) {
    where.push(`l.price <= $${i++}`);
    vals.push(req.query.max_price);
  }
  if (req.query.verified === "true") where.push("s.is_verified = TRUE");
  where.push("l.is_available = TRUE");

  const sortRaw = String(req.query.sort || "newest").toLowerCase();
  const sortAllowed = ["newest", "price_asc", "price_desc", "condition"];
  const sort = sortAllowed.includes(sortRaw) ? sortRaw : "newest";
  let orderBy = "l.created_at DESC";
  if (sort === "price_asc") orderBy = "l.price ASC NULLS LAST, l.created_at DESC";
  if (sort === "price_desc") orderBy = "l.price DESC NULLS LAST, l.created_at DESC";
  if (sort === "condition") {
    orderBy = `CASE l.condition::text
      WHEN 'new' THEN 1
      WHEN 'refurbished' THEN 2
      WHEN 'used' THEN 3
      ELSE 4
    END ASC, l.created_at DESC`;
  }

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM listings l
    JOIN sellers s ON s.id=l.seller_id
    WHERE ${where.join(" AND ")}
  `;
  const listQuery = `
    SELECT l.*, c.name AS category_name, a.name AS area_name, u.full_name AS seller_name, s.badge, s.is_verified
    FROM listings l
    JOIN categories c ON c.id=l.category_id
    JOIN areas a ON a.id=l.area_id
    JOIN sellers s ON s.id=l.seller_id
    JOIN users u ON u.id=s.user_id
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i++}
  `;
  vals.push(limit, offset);
  const [countResult, rowsResult] = await Promise.all([
    pool.query(countQuery, vals.slice(0, vals.length - 2)),
    pool.query(listQuery, vals)
  ]);
  return res.json({
    page,
    limit,
    total: countResult.rows[0].total,
    data: rowsResult.rows
  });
});

router.get("/listings/:id", async (req, res) => {
  const query = `
    SELECT l.*, c.name AS category_name, a.name AS area_name, u.full_name AS seller_name, u.phone AS seller_phone,
      s.badge, s.is_verified, s.whatsapp_number, s.user_id AS seller_user_id
    FROM listings l
    JOIN categories c ON c.id=l.category_id
    JOIN areas a ON a.id=l.area_id
    JOIN sellers s ON s.id=l.seller_id
    JOIN users u ON u.id=s.user_id
    WHERE l.id=$1 AND l.approved=TRUE AND s.status='approved'
  `;
  const { rows } = await pool.query(query, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Listing not found" });
  return res.json(rows[0]);
});

const postMessageSchema = Joi.object({
  listing_id: Joi.string().uuid().required(),
  peer_user_id: Joi.string().uuid().required(),
  body: Joi.string().trim().min(1).max(2000).required()
});

function uuidNorm(v) {
  if (v == null || v === "") return "";
  return String(v).trim().toLowerCase();
}

async function getListingSellerUserId(listingId) {
  const { rows } = await pool.query(
    `
    SELECT s.user_id AS seller_user_id
    FROM listings l
    JOIN sellers s ON s.id = l.seller_id
    WHERE l.id = $1 AND l.approved = TRUE AND s.status = 'approved'
  `,
    [listingId]
  );
  const raw = rows[0]?.seller_user_id;
  return raw != null ? uuidNorm(raw) : null;
}

function isBuyerSellerPair(me, peer, sellerUserId) {
  const A = uuidNorm(me);
  const B = uuidNorm(peer);
  const S = uuidNorm(sellerUserId);
  if (!A || !B || A === B) return false;
  return (A === S && B !== S) || (B === S && A !== S);
}

function authUserId(req) {
  const u = req.user;
  if (!u) return "";
  return uuidNorm(u.id ?? u.userId ?? u.sub);
}

router.get("/messages/inbox", requireAuth, async (req, res) => {
  const me = authUserId(req);
  if (!me) return res.status(401).json({ message: "Invalid token" });
  const { rows } = await pool.query(
    `
    WITH ranked AS (
      SELECT m.*,
        CASE WHEN m.sender_id = $1::uuid THEN m.receiver_id ELSE m.sender_id END AS other_id,
        ROW_NUMBER() OVER (
          PARTITION BY m.listing_id,
            CASE WHEN m.sender_id = $1::uuid THEN m.receiver_id ELSE m.sender_id END
          ORDER BY m.created_at DESC
        ) AS rn
      FROM messages m
      WHERE m.listing_id IS NOT NULL
        AND (m.sender_id = $1::uuid OR m.receiver_id = $1::uuid)
    )
    SELECT r.listing_id::text AS listing_id,
      r.other_id::text AS peer_user_id,
      u.full_name AS peer_full_name,
      l.title AS listing_title,
      l.price AS listing_price,
      COALESCE((l.image_urls)[1], '') AS listing_image,
      r.body AS last_message_body,
      r.created_at AS last_message_at
    FROM ranked r
    JOIN users u ON u.id = r.other_id
    JOIN listings l ON l.id = r.listing_id
    WHERE r.rn = 1
    ORDER BY r.created_at DESC
    LIMIT 100
  `,
    [me]
  );
  return res.json(rows);
});

router.get("/messages/partners", requireAuth, async (req, res) => {
  const listing_id = req.query.listing_id;
  if (!listing_id) return res.status(400).json({ message: "listing_id is required" });
  const sellerUserId = await getListingSellerUserId(listing_id);
  if (!sellerUserId) return res.status(404).json({ message: "Listing not found" });
  if (sellerUserId !== authUserId(req)) {
    return res.status(403).json({ message: "Only the seller can list buyers for this listing" });
  }
  const { rows } = await pool.query(
    `
    SELECT id, full_name FROM (
      SELECT DISTINCT u.id, u.full_name
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
      WHERE m.listing_id = $2
        AND (m.sender_id = $1 OR m.receiver_id = $1)
    ) t
    ORDER BY full_name ASC
  `,
    [authUserId(req), listing_id]
  );
  return res.json(rows);
});

router.get("/messages", requireAuth, async (req, res) => {
  const listing_id = req.query.listing_id;
  const peer_user_id = req.query.peer_user_id;
  if (!listing_id || !peer_user_id) {
    return res.status(400).json({ message: "listing_id and peer_user_id are required" });
  }
  const sellerUserId = await getListingSellerUserId(listing_id);
  if (!sellerUserId) return res.status(404).json({ message: "Listing not found" });
  const me = authUserId(req);
  if (!isBuyerSellerPair(me, peer_user_id, sellerUserId)) {
    return res.status(403).json({ message: "Invalid conversation" });
  }
  const { rows } = await pool.query(
    `
    SELECT m.id, m.sender_id, m.body, m.created_at, su.full_name AS sender_name
    FROM messages m
    JOIN users su ON su.id = m.sender_id
    WHERE m.listing_id = $1
      AND (
        (m.sender_id = $2::uuid AND m.receiver_id = $3::uuid)
        OR (m.sender_id = $3::uuid AND m.receiver_id = $2::uuid)
      )
    ORDER BY m.created_at ASC
    LIMIT 300
  `,
    [listing_id, me, uuidNorm(peer_user_id)]
  );
  return res.json(rows);
});

router.post("/messages", requireAuth, validate(postMessageSchema), async (req, res) => {
  const { listing_id, peer_user_id, body } = req.body;
  const sellerUserId = await getListingSellerUserId(listing_id);
  if (!sellerUserId) return res.status(404).json({ message: "Listing not found" });
  const me = authUserId(req);
  if (!isBuyerSellerPair(me, peer_user_id, sellerUserId)) {
    return res.status(403).json({ message: "Invalid conversation" });
  }
  const receiverId = me === sellerUserId ? uuidNorm(peer_user_id) : sellerUserId;
  const senderId = me;
  if (receiverId === senderId) {
    return res.status(400).json({ message: "Cannot message yourself" });
  }
  const { rows } = await pool.query(
    `
    INSERT INTO messages (sender_id, receiver_id, listing_id, body)
    VALUES ($1, $2, $3, $4)
    RETURNING id, sender_id, receiver_id, listing_id, body, created_at
  `,
    [senderId, receiverId, listing_id, body]
  );
  const nameRes = await pool.query("SELECT full_name FROM users WHERE id = $1", [senderId]);
  return res.status(201).json({
    ...rows[0],
    sender_name: nameRes.rows[0]?.full_name || ""
  });
});

router.get("/sellers/:id/listings", async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const sellerQuery = `
    SELECT s.id, s.badge, s.is_verified, u.full_name, u.phone, s.whatsapp_number
    FROM sellers s JOIN users u ON u.id=s.user_id
    WHERE s.id=$1 AND s.status='approved'
  `;
  const seller = await pool.query(sellerQuery, [req.params.id]);
  if (!seller.rows[0]) return res.status(404).json({ message: "Seller not found" });
  const listQuery = `
    SELECT l.*, c.name AS category_name, a.name AS area_name
    FROM listings l
    JOIN categories c ON c.id=l.category_id
    JOIN areas a ON a.id=l.area_id
    WHERE l.seller_id=$1 AND l.approved=TRUE AND l.is_available=TRUE
    ORDER BY l.created_at DESC LIMIT $2 OFFSET $3
  `;
  const data = await pool.query(listQuery, [req.params.id, limit, offset]);
  return res.json({ seller: seller.rows[0], page, limit, data: data.rows });
});

router.post("/seller/apply", requireAuth, validate(Joi.object({
  business_name: Joi.string().min(2).max(180).required(),
  phone: Joi.string().min(8).max(40).required(),
  area_id: Joi.string().uuid().required(),
  category_id: Joi.string().uuid().optional().allow(null),
  notes: Joi.string().allow("").optional(),
  id_document_url: Joi.string().uri().optional().allow("")
})), async (req, res) => {
  const q = `
    INSERT INTO seller_applications (user_id, business_name, phone, area_id, category_id, notes, id_document_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;
  const vals = [req.user.id, req.body.business_name, req.body.phone, req.body.area_id, req.body.category_id || null, req.body.notes || null, req.body.id_document_url || null];
  const { rows } = await pool.query(q, vals);
  return res.status(201).json(rows[0]);
});

router.get("/seller/me", requireAuth, async (req, res) => {
  const q = `
    SELECT s.*, u.full_name, u.phone
    FROM sellers s JOIN users u ON u.id=s.user_id
    WHERE s.user_id=$1
  `;
  const { rows } = await pool.query(q, [req.user.id]);
  return res.json(rows[0] || null);
});

router.get("/notifications", requireAuth, async (req, res) => {
  const notices = [];

  const appUpdates = await pool.query(`
    SELECT id, status, admin_note, reviewed_at, created_at
    FROM seller_applications
    WHERE user_id=$1
    ORDER BY COALESCE(reviewed_at, created_at) DESC
    LIMIT 20
  `, [req.user.id]);

  appUpdates.rows.forEach((r) => {
    if (r.status === "pending") {
      notices.push({
        id: `seller-app-pending-${r.id}`,
        type: "seller_application",
        title: "Seller application pending",
        message: "Your seller application is still under review.",
        created_at: r.created_at
      });
      return;
    }
    const titleMap = {
      approved: "Seller application approved",
      rejected: "Seller application rejected",
      more_info: "Seller application needs more info",
      suspended: "Seller account suspended"
    };
    notices.push({
      id: `seller-app-${r.status}-${r.id}`,
      type: "seller_application",
      title: titleMap[r.status] || "Seller application update",
      message: r.admin_note || `Status changed to ${r.status}.`,
      created_at: r.reviewed_at || r.created_at
    });
  });

  if (req.user.role === "admin") {
    const pending = await pool.query(
      "SELECT COUNT(*)::int AS total FROM seller_applications WHERE status='pending'"
    );
    notices.push({
      id: "admin-pending-apps",
      type: "admin",
      title: "Pending seller applications",
      message: `You have ${pending.rows[0].total} pending seller application(s).`,
      created_at: new Date().toISOString()
    });
  }

  const sellerOrders = await pool.query(
    `
    SELECT o.id, o.order_group_id, o.amount_ugx, o.qty, o.created_at,
      l.title AS listing_title, l.id AS listing_id,
      buyer_u.full_name AS buyer_name
    FROM orders o
    JOIN listings l ON l.id = o.listing_id
    JOIN sellers s ON s.id = l.seller_id
    JOIN users buyer_u ON buyer_u.id = o.buyer_id
    WHERE s.user_id = $1::uuid
    ORDER BY o.created_at DESC
    LIMIT 40
  `,
    [req.user.id]
  );
  sellerOrders.rows.forEach((o) => {
    notices.push({
      id: `seller-order-${o.id}`,
      type: "order",
      title: "New order on your listing",
      message: `${o.buyer_name} ordered ${o.qty}× ${o.listing_title} — ${Number(o.amount_ugx).toLocaleString()} UGX.`,
      created_at: o.created_at,
      href: `/listing/${o.listing_id}`
    });
  });

  notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(notices.slice(0, 50));
});

router.post("/seller/listings", requireAuth, requireRole("seller"), validate(Joi.object({
  title: Joi.string().max(180).required(),
  description: Joi.string().max(4000).required(),
  price: Joi.number().min(0).required(),
  condition: Joi.string().valid("new", "used", "refurbished").required(),
  category_id: Joi.string().uuid().required(),
  area_id: Joi.string().uuid().required(),
  image_urls: Joi.array().items(Joi.string().uri()).min(1).max(5).required(),
  requires_approval: Joi.boolean().default(false)
})), async (req, res) => {
  const seller = await pool.query("SELECT * FROM sellers WHERE user_id=$1 AND status='approved'", [req.user.id]);
  if (!seller.rows[0]) return res.status(403).json({ message: "Seller not approved" });
  const q = `
    INSERT INTO listings (seller_id, title, description, price, condition, category_id, area_id, image_urls, requires_approval, approved)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;
  const approved = !req.body.requires_approval;
  const vals = [seller.rows[0].id, req.body.title, req.body.description, req.body.price, req.body.condition, req.body.category_id, req.body.area_id, req.body.image_urls, req.body.requires_approval, approved];
  const { rows } = await pool.query(q, vals);
  return res.status(201).json(rows[0]);
});

router.get("/seller/listings/me", requireAuth, requireRole("seller"), async (req, res) => {
  const seller = await pool.query("SELECT id, status FROM sellers WHERE user_id=$1 LIMIT 1", [req.user.id]);
  if (!seller.rows[0]) return res.json([]);
  const { rows } = await pool.query(`
    SELECT l.*, c.name AS category_name, a.name AS area_name
    FROM listings l
    JOIN categories c ON c.id=l.category_id
    JOIN areas a ON a.id=l.area_id
    WHERE l.seller_id=$1
    ORDER BY l.created_at DESC
  `, [seller.rows[0].id]);
  return res.json(rows);
});

router.delete("/seller/listings/:id", requireAuth, requireRole("seller"), async (req, res) => {
  const seller = await pool.query("SELECT id FROM sellers WHERE user_id=$1 AND status='approved' LIMIT 1", [req.user.id]);
  if (!seller.rows[0]) return res.status(403).json({ message: "Seller not approved" });
  const del = await pool.query("DELETE FROM listings WHERE id=$1 AND seller_id=$2 RETURNING id", [req.params.id, seller.rows[0].id]);
  if (!del.rows[0]) return res.status(404).json({ message: "Listing not found" });
  return res.json({ ok: true });
});

router.patch(
  "/seller/listings/:id",
  requireAuth,
  requireRole("seller"),
  validate(
    Joi.object({
      is_available: Joi.boolean().required()
    })
  ),
  async (req, res) => {
    const seller = await pool.query("SELECT id FROM sellers WHERE user_id=$1 AND status='approved' LIMIT 1", [req.user.id]);
    if (!seller.rows[0]) return res.status(403).json({ message: "Seller not approved" });
    const { rows } = await pool.query(
      `UPDATE listings SET is_available = $1, updated_at = NOW() WHERE id = $2 AND seller_id = $3 RETURNING *`,
      [req.body.is_available, req.params.id, seller.rows[0].id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Listing not found" });
    return res.json(rows[0]);
  }
);

router.post("/delivery/calculate", validate(Joi.object({
  from_area_id: Joi.string().uuid().required(),
  to_area_id: Joi.string().uuid().required()
})), async (req, res) => {
  const q = `
    SELECT df.*, fa.name AS from_area_name, ta.name AS to_area_name
    FROM delivery_fares df
    JOIN areas fa ON fa.id=df.from_area_id
    JOIN areas ta ON ta.id=df.to_area_id
    WHERE df.from_area_id=$1 AND df.to_area_id=$2 AND active=TRUE
  `;
  const { rows } = await pool.query(q, [req.body.from_area_id, req.body.to_area_id]);
  if (!rows[0]) return res.status(404).json({ message: "Fare not configured" });
  return res.json(rows[0]);
});

const checkoutSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        listing_id: Joi.string().uuid().required(),
        qty: Joi.number().integer().min(1).max(99).required()
      })
    )
    .min(1)
    .max(50)
    .required()
});

router.post("/orders/checkout", requireAuth, validate(checkoutSchema), async (req, res) => {
  const merged = new Map();
  for (const line of req.body.items) {
    const prev = merged.get(line.listing_id) || 0;
    merged.set(line.listing_id, prev + line.qty);
  }
  const lines = [...merged.entries()].map(([listing_id, qty]) => ({ listing_id, qty }));

  const groupId = randomUUID();
  const buyerId = uuidNorm(req.user.id);
  if (!buyerId) {
    return res.status(401).json({ message: "Invalid session." });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    console.error("orders/checkout connect", e);
    return res.status(503).json({ message: "Database is busy. Please try again." });
  }

  try {
    await client.query("BEGIN");
    let total = 0;
    for (const line of lines) {
      const { rows } = await client.query(
        `
        SELECT l.id, l.title, l.price,
          COALESCE(l.is_available, TRUE) AS is_available,
          s.status AS seller_status, s.user_id AS seller_user_id
        FROM listings l
        JOIN sellers s ON s.id = l.seller_id
        WHERE l.id = $1::uuid AND l.approved = TRUE
      `,
        [line.listing_id]
      );
      const row = rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "One or more products are no longer available." });
      }
      if (row.is_available === false || row.seller_status !== "approved") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "One or more products are no longer available." });
      }
      if (uuidNorm(row.seller_user_id) === buyerId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "You cannot order your own listing." });
      }
      const unit = Number(row.price);
      if (!Number.isFinite(unit) || unit < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "One or more products are no longer available." });
      }
      const lineTotal = unit * line.qty;
      total += lineTotal;
      await client.query(
        `
        INSERT INTO orders (buyer_id, listing_id, amount_ugx, status, order_group_id, qty, unit_price_ugx)
        VALUES ($1::uuid, $2::uuid, $3, 'pending', $4::uuid, $5, $6)
      `,
        [buyerId, line.listing_id, lineTotal, groupId, line.qty, unit]
      );
      const titleShort = String(row.title || "item").slice(0, 160);
      const msgBody =
        `New order: ${line.qty} × ${unit} UGX = ${lineTotal} UGX for "${titleShort}". Order ref: ${groupId}. Open Messages to reply.`.slice(
          0,
          2000
        );
      await client.query(
        `INSERT INTO messages (sender_id, receiver_id, listing_id, body) VALUES ($1::uuid, $2::uuid, $3::uuid, $4)`,
        [buyerId, row.seller_user_id, line.listing_id, msgBody]
      );
    }
    await client.query("COMMIT");
    return res.status(201).json({ order_group_id: groupId, total_ugx: total, line_count: lines.length });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore rollback errors (e.g. no active transaction) */
    }
    console.error("orders/checkout", err);
    const code = err && err.code;
    if (code === "23503") {
      return res.status(400).json({ message: "One or more products are no longer available." });
    }
    return res.status(500).json({
      message:
        env.nodeEnv === "development" && err && err.message ? err.message : "Could not place order."
    });
  } finally {
    if (client) client.release();
  }
});

router.get("/orders/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT order_group_id,
      COUNT(*)::int AS line_count,
      SUM(amount_ugx)::numeric AS total_ugx,
      MIN(created_at) AS created_at,
      MIN(status) AS status
    FROM orders
    WHERE buyer_id = $1
    GROUP BY order_group_id
    ORDER BY MIN(created_at) DESC
    LIMIT 100
  `,
    [req.user.id]
  );
  return res.json(rows);
});

router.get("/orders/:groupId", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `
    SELECT o.id, o.listing_id, o.qty, o.unit_price_ugx, o.amount_ugx, o.status, o.created_at,
      l.title, l.image_urls
    FROM orders o
    JOIN listings l ON l.id = o.listing_id
    WHERE o.order_group_id = $1 AND o.buyer_id = $2
    ORDER BY o.created_at ASC
  `,
    [req.params.groupId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: "Order not found" });
  const head = rows[0];
  const total = rows.reduce((s, r) => s + Number(r.amount_ugx), 0);
  return res.json({
    order_group_id: req.params.groupId,
    created_at: head.created_at,
    status: head.status,
    lines: rows.map((r) => ({
      id: r.id,
      listing_id: r.listing_id,
      title: r.title,
      qty: r.qty,
      unit_price_ugx: r.unit_price_ugx,
      amount_ugx: r.amount_ugx,
      image_urls: r.image_urls
    })),
    total_ugx: total
  });
});

router.get("/admin/seller-applications", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT sa.*, u.full_name AS applicant_name, a.name AS area_name, c.name AS category_name
    FROM seller_applications sa
    JOIN users u ON u.id=sa.user_id
    JOIN areas a ON a.id=sa.area_id
    LEFT JOIN categories c ON c.id=sa.category_id
    ORDER BY sa.created_at DESC
  `);
  return res.json(rows);
});

router.patch("/admin/seller-applications/:id", requireAuth, requireRole("admin"), validate(Joi.object({
  status: Joi.string().valid("approved", "rejected", "more_info", "suspended").required(),
  admin_note: Joi.string().allow("").optional()
})), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const appRes = await client.query("SELECT * FROM seller_applications WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!appRes.rows[0]) return res.status(404).json({ message: "Application not found" });
    const app = appRes.rows[0];
    await client.query(
      "UPDATE seller_applications SET status=$1, admin_note=$2, reviewed_by=$3, reviewed_at=NOW() WHERE id=$4",
      [req.body.status, req.body.admin_note || null, req.user.id, req.params.id]
    );
    if (req.body.status === "approved") {
      await client.query("UPDATE users SET role='seller' WHERE id=$1", [app.user_id]);
      await client.query(`
        INSERT INTO sellers (user_id, application_id, status, badge, is_verified, whatsapp_number)
        VALUES ($1,$2,'approved','new',FALSE,$3)
        ON CONFLICT (user_id) DO UPDATE SET status='approved', application_id=$2
      `, [app.user_id, app.id, app.phone]);
    }
    if (req.body.status === "suspended") {
      await client.query("UPDATE sellers SET status='suspended', badge='suspended' WHERE user_id=$1", [app.user_id]);
    }
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Failed to update application" });
  } finally {
    client.release();
  }
});

router.post("/admin/delivery-fares", requireAuth, requireRole("admin"), validate(Joi.object({
  from_area_id: Joi.string().uuid().required(),
  to_area_id: Joi.string().uuid().required(),
  distance_km: Joi.number().min(0).required(),
  fare_ugx: Joi.number().min(0).required()
})), async (req, res) => {
  const q = `
    INSERT INTO delivery_fares (from_area_id, to_area_id, distance_km, fare_ugx)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT(from_area_id, to_area_id)
    DO UPDATE SET distance_km=EXCLUDED.distance_km, fare_ugx=EXCLUDED.fare_ugx, active=TRUE
    RETURNING *
  `;
  const vals = [req.body.from_area_id, req.body.to_area_id, req.body.distance_km, req.body.fare_ugx];
  const { rows } = await pool.query(q, vals);
  return res.status(201).json(rows[0]);
});

router.get("/admin/delivery-fares", requireAuth, requireRole("admin"), async (_, res) => {
  const { rows } = await pool.query(`
    SELECT df.*, fa.name AS from_area_name, ta.name AS to_area_name
    FROM delivery_fares df
    JOIN areas fa ON fa.id=df.from_area_id
    JOIN areas ta ON ta.id=df.to_area_id
    ORDER BY df.created_at DESC
  `);
  return res.json(rows);
});

router.get("/admin/analytics", requireAuth, requireRole("admin"), async (_, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM users)::int AS users_total,
      (SELECT COUNT(*) FROM sellers WHERE status='approved')::int AS sellers_approved,
      (SELECT COUNT(*) FROM seller_applications WHERE status='pending')::int AS pending_applications,
      (SELECT COUNT(*) FROM listings WHERE approved=TRUE)::int AS active_listings
  `;
  const { rows } = await pool.query(query);
  return res.json(rows[0]);
});

router.get("/admin/users", requireAuth, requireRole("admin"), async (_, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.full_name, u.phone, u.email, u.role, u.is_active, u.created_at, u.updated_at, u.area_id, a.name AS area_name
    FROM users u
    LEFT JOIN areas a ON a.id = u.area_id
    ORDER BY u.created_at DESC
  `);
  return res.json(rows);
});

router.get("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows: urows } = await pool.query(
    `
    SELECT u.id, u.full_name, u.phone, u.email, u.role, u.is_active, u.area_id, u.created_at, u.updated_at,
      a.name AS area_name
    FROM users u
    LEFT JOIN areas a ON a.id = u.area_id
    WHERE u.id = $1::uuid
  `,
    [req.params.id]
  );
  if (!urows[0]) return res.status(404).json({ message: "User not found" });
  const uid = urows[0].id;
  const { rows: stats } = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1) AS orders_count,
      (SELECT COUNT(*)::int FROM messages WHERE sender_id = $1 OR receiver_id = $1) AS messages_count,
      (SELECT COUNT(*)::int FROM sellers WHERE user_id = $1) AS seller_profile_count,
      (SELECT COUNT(*)::int FROM listings l JOIN sellers s ON s.id = l.seller_id WHERE s.user_id = $1) AS listings_count
  `,
    [uid]
  );
  return res.json({ user: urows[0], stats: stats[0] });
});

const patchAdminUserSchema = Joi.object({
  is_active: Joi.boolean().optional(),
  role: Joi.string().valid("user", "seller", "admin").optional()
}).min(1);

router.patch("/admin/users/:id", requireAuth, requireRole("admin"), validate(patchAdminUserSchema), async (req, res) => {
  const targetId = req.params.id;
  const me = uuidNorm(req.user.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: targets } = await client.query("SELECT id, role FROM users WHERE id = $1::uuid", [targetId]);
    if (!targets[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }
    const target = targets[0];
    const { rows: otherAdminRows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> $1::uuid",
      [targetId]
    );
    const otherAdminCount = otherAdminRows[0].n;
    if (target.role === "admin") {
      if (req.body.role != null && req.body.role !== "admin" && otherAdminCount < 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot change role of the last admin." });
      }
      if (req.body.is_active === false && otherAdminCount < 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot deactivate the last admin." });
      }
    }
    if (uuidNorm(targetId) === me && req.body.is_active === false) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "You cannot deactivate your own account here." });
    }
    const sets = [];
    const vals = [];
    let i = 1;
    if (req.body.is_active !== undefined) {
      sets.push(`is_active = $${i++}`);
      vals.push(req.body.is_active);
    }
    if (req.body.role !== undefined) {
      sets.push(`role = $${i++}`);
      vals.push(req.body.role);
    }
    sets.push(`updated_at = NOW()`);
    vals.push(targetId);
    const { rows } = await client.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i}::uuid RETURNING id, full_name, phone, email, role, is_active, area_id, created_at, updated_at`,
      vals
    );
    await client.query("COMMIT");
    const { rows: full } = await pool.query(
      `SELECT u.*, a.name AS area_name FROM users u LEFT JOIN areas a ON a.id = u.area_id WHERE u.id = $1::uuid`,
      [targetId]
    );
    return res.json(full[0]);
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    console.error("admin patch user", e);
    return res.status(500).json({ message: "Could not update user." });
  } finally {
    client.release();
  }
});

router.delete("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const targetId = req.params.id;
  if (uuidNorm(targetId) === uuidNorm(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: targets } = await client.query("SELECT id, role FROM users WHERE id = $1::uuid", [targetId]);
    if (!targets[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }
    if (targets[0].role === "admin") {
      const { rows: acRows } = await client.query(
        "SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> $1::uuid",
        [targetId]
      );
      if (acRows[0].n < 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot delete the last admin account." });
      }
    }
    await client.query("DELETE FROM orders WHERE buyer_id = $1::uuid", [targetId]);
    await client.query("UPDATE seller_applications SET reviewed_by = NULL WHERE reviewed_by = $1::uuid", [targetId]);
    const del = await client.query("DELETE FROM users WHERE id = $1::uuid RETURNING id", [targetId]);
    if (!del.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    console.error("admin delete user", e);
    return res.status(500).json({ message: "Could not delete user. They may have data that must be removed first." });
  } finally {
    client.release();
  }
});

router.get("/admin/listings", requireAuth, requireRole("admin"), async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM listings l`);
  const total = countRows[0].total;
  const { rows } = await pool.query(
    `
    SELECT l.*, u.full_name AS seller_name, u.phone AS seller_phone, c.name AS category_name, a.name AS area_name
    FROM listings l
    JOIN sellers s ON s.id = l.seller_id
    JOIN users u ON u.id = s.user_id
    JOIN categories c ON c.id = l.category_id
    JOIN areas a ON a.id = l.area_id
    ORDER BY l.created_at DESC
    LIMIT $1 OFFSET $2
  `,
    [limit, offset]
  );
  return res.json({ page, limit, total, data: rows });
});

const patchAdminListingSchema = Joi.object({
  approved: Joi.boolean().optional(),
  is_available: Joi.boolean().optional(),
  is_featured: Joi.boolean().optional()
}).min(1);

router.patch("/admin/listings/:id", requireAuth, requireRole("admin"), validate(patchAdminListingSchema), async (req, res) => {
  const sets = [];
  const vals = [];
  let i = 1;
  if (req.body.approved !== undefined) {
    sets.push(`approved = $${i++}`);
    vals.push(req.body.approved);
  }
  if (req.body.is_available !== undefined) {
    sets.push(`is_available = $${i++}`);
    vals.push(req.body.is_available);
  }
  if (req.body.is_featured !== undefined) {
    sets.push(`is_featured = $${i++}`);
    vals.push(req.body.is_featured);
  }
  if (sets.length === 0) return res.status(400).json({ message: "No changes" });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE listings SET ${sets.join(", ")} WHERE id = $${i}::uuid RETURNING *`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ message: "Listing not found" });
  return res.json(rows[0]);
});

router.delete("/admin/listings/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const del = await pool.query("DELETE FROM listings WHERE id = $1::uuid RETURNING id", [req.params.id]);
  if (!del.rows[0]) return res.status(404).json({ message: "Listing not found" });
  return res.json({ ok: true });
});

router.get("/admin/orders", requireAuth, requireRole("admin"), async (_, res) => {
  const { rows } = await pool.query(`
    SELECT o.id, o.order_group_id, o.amount_ugx, o.qty, o.status, o.created_at,
      u.full_name AS buyer_name, u.phone AS buyer_phone,
      l.title AS listing_title, l.id AS listing_id,
      seller_u.full_name AS seller_name
    FROM orders o
    JOIN users u ON u.id = o.buyer_id
    JOIN listings l ON l.id = o.listing_id
    JOIN sellers s ON s.id = l.seller_id
    JOIN users seller_u ON seller_u.id = s.user_id
    ORDER BY o.created_at DESC
    LIMIT 200
  `);
  return res.json(rows);
});

module.exports = router;
