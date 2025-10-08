// api/dbtest.js
const { Pool } = require("pg");

module.exports = async (_req, res) => {
  try {
    const hasEnv = !!process.env.DATABASE_URL;
    if (!hasEnv) return res.status(500).json({ ok:false, where:"env", message:"DATABASE_URL is missing" });

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const r = await pool.query("select now() as now");
    res.status(200).json({ ok:true, now:r.rows[0].now });
  } catch (e) {
    res.status(500).json({
      ok:false,
      where:"db",
      message: e.message,
      code: e.code || null,
      detail: e.detail || null
    });
  }
};
