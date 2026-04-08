const express = require("express");
const { randomUUID } = require("crypto");
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
    ORDER BY l.created_at DESC
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
    WHERE l.seller_id=$1 AND l.approved=TRUE
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

  notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(notices.slice(0, 30));
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
    SELECT u.id, u.full_name, u.phone, u.role, u.is_active, u.created_at, a.name AS area_name
    FROM users u
    LEFT JOIN areas a ON a.id = u.area_id
    ORDER BY u.created_at DESC
  `);
  return res.json(rows);
});

module.exports = router;
