const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./pool");

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, "../../sql/schema.sql"), "utf8");
  await pool.query(schema);

  const areas = ["Town Center", "KIU Area", "Kizinda", "Nyakabirizi", "Surrounding villages"];
  for (const name of areas) {
    await pool.query("INSERT INTO areas (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [name]);
  }

  const categories = [
    "Food & Agriculture",
    "Electronics",
    "Clothing",
    "Shoes",
    "Construction Materials",
    "Furniture",
    "Vehicles",
    "Rental Items",
    "Services"
  ];
  for (const name of categories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await pool.query("INSERT INTO categories (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING", [name, slug]);
  }

  const area = await pool.query("SELECT id FROM areas WHERE name='Town Center' LIMIT 1");
  const adminPass = await bcrypt.hash("Admin@123", 10);
  await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, area_id)
     VALUES ('System Admin', '+256700000001', $1, 'admin', $2)
     ON CONFLICT (phone) DO NOTHING`,
    [adminPass, area.rows[0].id]
  );

  const userPass = await bcrypt.hash("Seller@123", 10);
  await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, area_id)
     VALUES ('Demo Seller', '+256700000002', $1, 'user', $2)
     ON CONFLICT (phone) DO NOTHING`,
    [userPass, area.rows[0].id]
  );

  // eslint-disable-next-line no-console
  console.log("Seed completed. Admin: +256700000001 / Admin@123");
  await pool.end();
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await pool.end();
  process.exit(1);
});
