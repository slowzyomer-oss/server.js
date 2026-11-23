const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MASTER_KEY = process.env.MASTER_KEY || "SPECTRE-LOOTLABS-2026";
const KEY_TTL_SECONDS = Number(process.env.KEY_TTL_SECONDS || 86400); // 24 saat

// İleride LootLabs callback veya dinamik key üretimi eklendiğinde burada tutulur
const issuedKeys = new Map();

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "spectre-key-api" });
});

app.post("/api/verify", (req, res) => {
  const rawKey = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  const hwid = typeof req.body?.hwid === "string" ? req.body.hwid.trim() : "";

  if (!rawKey) {
    return res.status(400).json({ valid: false, message: "Key is required." });
  }

  // Sabit / test key kontrolü
  if (rawKey === MASTER_KEY) {
    return res.status(200).json({
      valid: true,
      expiresIn: KEY_TTL_SECONDS,
      message: "Key verified."
    });
  }

  // Dinamik üretilmiş key kontrolü
  const record = issuedKeys.get(rawKey);
  if (record) {
    if (Date.now() > record.expiresAt) {
      issuedKeys.delete(rawKey);
      return res.status(401).json({ valid: false, message: "Key expired." });
    }
    if (record.hwid && hwid && record.hwid !== hwid) {
      return res.status(403).json({ valid: false, message: "HWID mismatch." });
    }
    return res.status(200).json({
      valid: true,
      expiresIn: Math.floor((record.expiresAt - Date.now()) / 1000),
      message: "Key verified."
    });
  }

  return res.status(401).json({ valid: false, message: "Invalid key." });
});

app.listen(PORT, () => {
  console.log(`Spectre Key API listening on port ${PORT}`);
});
