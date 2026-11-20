/**
 * Proxy local para subir PDF a IPFS (Pinata) sin exponer la clave en el navegador.
 *
 * Uso:  PINATA_JWT=... node server/ipfs-proxy.js      (o npm run ipfs-proxy, que lee .env)
 * Escucha en http://localhost:8787 y Vite le reenvía /api/ipfs/* (client/vite.config.js).
 *
 * Reenvía el cuerpo multipart tal cual a pinFileToIPFS y añade el encabezado
 * Authorization con el PINATA_JWT, que solo existe en el servidor.
 */
require("dotenv").config();
const http = require("http");

const PORT = Number(process.env.IPFS_PROXY_PORT || 8787);
const JWT = process.env.PINATA_JWT;
const MAX_BYTES = 50 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST" || !req.url.startsWith("/api/ipfs/file")) return send(404, { error: "Ruta no encontrada" });
  if (!JWT) return send(503, { error: "PINATA_JWT no está configurado en el servidor" });
  if (Number(req.headers["content-length"] || 0) > MAX_BYTES) return send(413, { error: "El archivo supera 50 MB" });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${JWT}`, "Content-Type": req.headers["content-type"] },
      body: Buffer.concat(chunks),
    });
    const data = await r.json();
    if (!r.ok) return send(r.status, { error: data.error || "Error de Pinata" });
    send(200, { cid: data.IpfsHash });
  } catch (err) {
    send(500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Proxy IPFS escuchando en http://localhost:${PORT}/api/ipfs/file`));
