/**
 * Crea en Firebase las cuentas ficticias del prototipo (Secretaría, tres docentes y un estudiante)
 * con su perfil en Firestore. Los roles solo se asignan aquí, con credenciales de administrador;
 * desde la app nadie puede darse rol de docente o de Secretaría.
 *
 * Uso:
 *   1. Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar clave privada.
 *   2. Guardar el JSON fuera del repositorio y exportar:
 *        GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json
 *   3. npm run seed:firebase
 *
 * Las billeteras son las cuentas #0, #2, #3, #4 y #1 del nodo Hardhat (claves públicas de prueba).
 * En otra red, cambiarlas por las billeteras reales de cada docente.
 */
require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const db = admin.firestore();

const PASSWORD = process.env.SEED_PASSWORD || "Upec-demo-2026";

const USERS = [
  { email: "secretaria.demo@upec.edu.ec", name: "MSc. Gabriela Torres Benavides", role: "admin",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
  { email: "docente1.demo@upec.edu.ec", name: "PhD. Roberto Salazar Mena", role: "docente",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  { email: "docente2.demo@upec.edu.ec", name: "MSc. Patricia Guerrón Ortiz", role: "docente",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
  { email: "docente3.demo@upec.edu.ec", name: "Ing. Javier Tapia Rosero", role: "docente",
    walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
  { email: "estudiante.demo@upec.edu.ec", name: "Andrade Pérez Luis Fernando", role: "student",
    cedula: "0400000001", walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
];

async function upsert(u) {
  let rec;
  try {
    rec = await auth.getUserByEmail(u.email);
  } catch {
    rec = await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.name });
  }
  await auth.setCustomUserClaims(rec.uid, { role: u.role });
  await db.collection("users").doc(rec.uid).set(
    {
      ...u,
      faculty: "Facultad de Industrias Agropecuarias y Ciencias Ambientales",
      facultyId: "fiaca",
      career: "Computación",
      termsAccepted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  ${u.role.padEnd(8)} ${u.email}`);
}

(async () => {
  console.log("Creando cuentas ficticias en Firebase…");
  for (const u of USERS) await upsert(u);
  console.log(`Listo. Contraseña común: ${PASSWORD}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
