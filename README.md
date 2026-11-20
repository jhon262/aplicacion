# Prototipo Web3 de titulación UPEC

Aplicación del Trabajo de Integración Curricular "Arquitecturas descentralizadas con Web3 y Smart Contracts" (Carrera de Computación, UPEC). Registra trabajos de titulación en una cadena EVM, los somete a un tribunal de tres docentes y emite un certificado ERC-721 intransferible cuando los tres aprueban.

Prototipo académico sin validez legal. Los datos de demostración son ficticios.

## Componentes

| Carpeta | Contenido |
| :--- | :--- |
| `contracts/` | `ProjectRegistry.sol` (registro, tribunal, votación unánime, certificado soulbound), `UPECToken.sol` (ERC-20 con faucet cada 24 h), `PurchaseEscrow.sol` (custodia) |
| `test/` | 69 pruebas Mocha/Chai |
| `scripts/` | despliegue, datos de demostración en la cadena, carga de cuentas en Firebase |
| `server/ipfs-proxy.js`, `api/ipfs/` | proxy que sube el PDF a Pinata sin exponer el JWT en el navegador |
| `client/` | React + Vite + wagmi/RainbowKit, Firebase Auth/Firestore, Capacitor (Android) |
| `docs/evidencias/` | salidas de pruebas, gas, cobertura, Slither y Solhint |

## Reglas del contrato `ProjectRegistry`

- El registro guarda título, resumen, CID de IPFS y hash SHA-256 del PDF. Un mismo PDF no se puede registrar dos veces.
- Secretaría (`DEFAULT_ADMIN_ROLE`) asigna tres docentes con `DOCENTE_ROLE`, distintos y diferentes del autor.
- Cada integrante vota una vez. Un voto en contra rechaza; el tercer voto a favor aprueba y emite el certificado.
- Plazo de 7 días desde la asignación del tribunal. Vencido sin unanimidad, `finalizeProject` lo cierra como rechazado.
- El autor puede editar título y resumen hasta el primer voto.
- El certificado no admite `transfer`, `approve` ni `setApprovalForAll`.
- `verifyDocument(hash)` permite comprobar un PDF sin conocer el número de proyecto.

## Arranque rápido (red local)

```bash
npm install
npm --prefix client install
cp .env.example .env                 # PINATA_JWT para IPFS real
cp client/.env.example client/.env   # VITE_FIREBASE_* para Firebase

npx hardhat node --hostname 127.0.0.1
npm run deploy:local
npm run preparar
npm run ipfs-proxy
npm run dev                          # http://localhost:3000
```

Sin `VITE_FIREBASE_*` la app funciona en modo local con las cuentas de demostración (contraseña `demo2026`). Sin `PINATA_JWT` el PDF no se publica en IPFS, pero su hash sí se registra en la cadena.

## Firebase

```bash
npx firebase-tools login
npx firebase-tools use <id-del-proyecto>
npx firebase-tools deploy --only firestore
GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json npm run seed:firebase
```

Firestore guarda solo datos personales (nombre, cédula, carrera, calificación) en `projects/{hash del PDF}` y los perfiles en `users/{uid}`. El estado y los votos se leen siempre del contrato. Las reglas impiden que un usuario se asigne a sí mismo el rol de docente o de Secretaría.

## Android

```bash
cd client
npm run build
npx cap sync android
npx cap open android
```

En el teléfono, `VITE_RPC_URL` debe apuntar a la IP de la PC con el nodo Hardhat y `VITE_IPFS_PROXY_URL` a la URL completa del proxy. El escáner QR usa la cámara del dispositivo.

## Pruebas

```bash
npm test
npm run coverage
slither .
npx solhint "contracts/**/*.sol"
```
