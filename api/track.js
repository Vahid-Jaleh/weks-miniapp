const crypto = require("crypto");
const { Pool } = require("pg");

const pool = global.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
if (!global.pgPool) global.pgPool = pool;

function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash") || "";
    params.delete("hash");
    const dataCheckString = Array.from(params.entries()).map(([k,v]) => `${k}=${v}`).sort().join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const checkHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(checkHash, "hex"), Buffer.from(hash, "hex"))
      ? { ok: true, data: params } : { ok: false };
  } catch { return { ok: false }; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { initData, event_type, event_value } = req.body || {};
    const v = verifyInitData(initData || "", process.env.BOT_TOKEN);
    if (!v.ok) return res.status(401).json({ error: "Invalid initData" });

    const userRaw = v.data.get("user");
    if (!userRaw) return res.status(400).json({ error: "No user in initData" });
    const u = JSON.parse(userRaw);

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into public.users(user_id, username, first_name, last_name, language_code, is_premium)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (user_id) do update
           set username=excluded.username, first_name=excluded.first_name,
               last_name=excluded.last_name, language_code=excluded.language_code,
               is_premium=excluded.is_premium, updated_at=now()`,
        [u.id, u.username ?? null, u.first_name ?? null, u.last_name ?? null, u.language_code ?? null, !!u.is_premium]
      );
      await client.query(
        `insert into public.events(user_id, event_type, event_value)
         values ($1,$2,$3)`,
        [u.id, event_type, event_value ?? null]
      );
      await client.query("commit");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).json({ ok: true });
    } catch (e) {
      await client.query("rollback");
      console.error(e);
      res.status(500).json({ error: "DB error" });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};
