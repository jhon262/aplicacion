/**
 * Integración con IPFS (Pinata) y huella SHA-256 de los PDF.
 *
 * Las credenciales de Pinata NO van en el navegador. El cliente envía el PDF a un
 * proxy propio (VITE_IPFS_PROXY_URL, por defecto /api/ipfs) que guarda el PINATA_JWT
 * del lado del servidor:
 *   - en desarrollo: server/ipfs-proxy.js (npm run ipfs-proxy)
 *   - en Vercel:     api/ipfs/file.js
 *
 * Si el proxy no responde, la aplicación entra en "modo demostración": calcula un
 * identificador local que NO es un CID de IPFS y lo marca con isDemo = true, para que
 * la interfaz lo muestre así. El hash SHA-256 del PDF se calcula siempre y es el que
 * se registra en el contrato para verificar la integridad del documento.
 */

const PROXY_URL = import.meta.env.VITE_IPFS_PROXY_URL || '/api/ipfs';
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

/** SHA-256 del archivo en formato 0x… (bytes32), el mismo valor que guarda ProjectRegistry. */
export async function computeFileSha256(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return '0x' + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sube el PDF a IPFS mediante el proxy.
 * @returns {Promise<{cid, ipfsUrl, gatewayUrl, isDemo, documentHash}>}
 */
export async function uploadFileToIPFS(file) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  if (file.type && file.type !== 'application/pdf') throw new Error('El documento debe ser un PDF.');

  const documentHash = await computeFileSha256(file);

  try {
    const form = new FormData();
    form.append('file', file, file.name);
    // Solo metadatos técnicos: ningún dato personal viaja a IPFS.
    form.append('pinataMetadata', JSON.stringify({ name: `tesis-${documentHash.slice(2, 14)}.pdf` }));
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
    const res = await fetch(`${PROXY_URL}/file`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Proxy IPFS respondió ${res.status}`);
    const { cid } = await res.json();
    if (!cid) throw new Error('El proxy IPFS no devolvió un CID.');
    return { cid, ipfsUrl: `ipfs://${cid}`, gatewayUrl: `${IPFS_GATEWAY}${cid}`, isDemo: false, documentHash };
  } catch (err) {
    console.warn('IPFS no disponible, se usa el modo demostración:', err.message);
    // Identificador local derivado del hash. No es un CID real ni está en IPFS.
    const localId = `local-${documentHash.slice(2, 50)}`;
    return { cid: localId, ipfsUrl: null, gatewayUrl: null, isDemo: true, documentHash };
  }
}

/** Indica si un CID corresponde al modo demostración (no está en IPFS). */
export function isDemoCid(cid) {
  return typeof cid === 'string' && (cid.startsWith('local-') || cid.startsWith('bafkreidemo'));
}

export function gatewayUrlFor(cid) {
  return cid && !isDemoCid(cid) ? `${IPFS_GATEWAY}${cid}` : null;
}
