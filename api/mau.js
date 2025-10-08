const { Pool } = require("pg");
const pool = global.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
if (!global.pgPool) global.pgPool = pool;

module.exports = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      with tz_now as ( select (now() at time zone 'Australia/Adelaide') as local_now )
      select count(distinct e.user_id) as mau
      from public.events e, tz_now
      where e.occurred_at >= ( (tz_now.local_now - interval '30 days') at time zone 'Australia/Adelaide' )
        and e.event_type in ('app_open','answer_correct','answer_wrong','invite_sent');
    `);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ mau: Number(rows[0]?.mau ?? 0) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
