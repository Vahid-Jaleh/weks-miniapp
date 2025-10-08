module.exports = (_req, res) => {
  // Safe: only shows boolean flags, not secrets
  res.status(200).json({
    has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    has_BOT_TOKEN: Boolean(process.env.BOT_TOKEN)
  });
};
