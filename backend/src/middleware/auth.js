const { verifyToken } = require("../utils/jwt");
const pool = require("../db/pool");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(403).json({ message: "Forbidden" });
    const uid = req.user.id ?? req.user.userId ?? req.user.sub;
    if (!uid) return res.status(403).json({ message: "Forbidden" });
    try {
      const { rows } = await pool.query(
        "SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1",
        [uid]
      );
      const user = rows[0];
      if (!user || !user.is_active || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user.role = user.role;
      return next();
    } catch {
      return res.status(500).json({ message: "Could not verify permissions." });
    }
  };
}

module.exports = { requireAuth, requireRole };
