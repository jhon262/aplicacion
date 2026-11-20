// Función serverless de Vercel equivalente a server/ipfs-proxy.js.
// Configure PINATA_JWT en las variables de entorno del proyecto en Vercel (no con prefijo VITE_).
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return res.status(503).json({ error: 'PINATA_JWT no está configurado' });
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': req.headers['content-type'] },
      body: Buffer.concat(chunks),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || 'Error de Pinata' });
    return res.status(200).json({ cid: data.IpfsHash });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
