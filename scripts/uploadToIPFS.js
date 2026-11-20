require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Obtiene los headers de autenticación apropiados para Pinata (JWT o API Key/Secret).
 */
function getPinataHeaders() {
  if (PINATA_JWT && PINATA_JWT !== "tu_pinata_jwt_token_aqui") {
    return {
      Authorization: `Bearer ${PINATA_JWT}`,
    };
  } else if (PINATA_API_KEY && PINATA_API_SECRET) {
    return {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
    };
  } else {
    throw new Error(
      "Credenciales de Pinata no encontradas. Configura PINATA_API_KEY y PINATA_API_SECRET (o PINATA_JWT) en tu archivo .env"
    );
  }
}

/**
 * Sube un archivo digital (PDF de tesis, documento, imagen) a IPFS mediante Pinata.
 * @param {string} filePath Ruta absoluta o relativa al archivo local.
 * @param {string} [customName] Nombre personalizado para identificar el archivo en Pinata.
 * @returns {Promise<{ cid: string, ipfsUrl: string, gatewayUrl: string, timestamp: string }>}
 */
async function uploadFileToIPFS(filePath, customName = null) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`El archivo no existe en la ruta: ${resolvedPath}`);
  }

  const fileName = customName || path.basename(resolvedPath);
  const formData = new FormData();
  const fileStream = fs.createReadStream(resolvedPath);

  formData.append("file", fileStream);

  // Metadatos de Pinata para trazabilidad
  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: {
      institution: "UPEC",
      platform: "Sistema Descentralizado Web3",
      uploadedAt: new Date().toISOString(),
    },
  });
  formData.append("pinataMetadata", metadata);

  // Opciones de pinning
  const pinataOptions = JSON.stringify({
    cidVersion: 1, // CIDv1 estándar
  });
  formData.append("pinataOptions", pinataOptions);

  try {
    const authHeaders = getPinataHeaders();
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          ...authHeaders,
          ...formData.getHeaders(),
        },
      }
    );

    const cid = response.data.IpfsHash;
    return {
      cid: cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      timestamp: response.data.Timestamp,
    };
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Error al subir archivo a Pinata: ${errorMessage}`);
  }
}

/**
 * Sube un objeto JSON con metadatos (Estándar ERC-721 para la certificación de proyectos).
 * @param {object} jsonData Metadatos del proyecto o certificado.
 * @param {string} [metadataName] Nombre del recurso para Pinata.
 * @returns {Promise<{ cid: string, ipfsUrl: string, gatewayUrl: string }>}
 */
async function uploadJSONToIPFS(jsonData, metadataName = "project-metadata.json") {
  try {
    const authHeaders = getPinataHeaders();
    const body = {
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: metadataName,
        keyvalues: {
          institution: "UPEC",
          type: "ERC721_Metadata",
        },
      },
      pinataContent: jsonData,
    };

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      }
    );

    const cid = response.data.IpfsHash;
    return {
      cid: cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      timestamp: response.data.Timestamp,
    };
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Error al subir JSON de metadatos a Pinata: ${errorMessage}`);
  }
}

// Ejemplo de uso por línea de comandos: node scripts/uploadToIPFS.js <ruta_archivo>
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.log("Uso: node scripts/uploadToIPFS.js <ruta_al_archivo>");
      console.log("Ejemplo: node scripts/uploadToIPFS.js ./tesis-upec.pdf");
      process.exit(0);
    }

    try {
      console.log(`Subiendo '${args[0]}' a IPFS vía Pinata...`);
      const result = await uploadFileToIPFS(args[0]);
      console.log("\n Archivo subido con éxito:");
      console.log(`- IPFS CID:     ${result.cid}`);
      console.log(`- URI:          ${result.ipfsUrl}`);
      console.log(`- Gateway HTTP: ${result.gatewayUrl}`);
    } catch (err) {
      console.error("\n❌ Fallo en la subida a IPFS:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  uploadFileToIPFS,
  uploadJSONToIPFS,
};
