/**
 * Conexión con Firebase (capa off-chain del prototipo).
 *
 * - Firebase Authentication: inicio de sesión con correo y contraseña.
 * - Cloud Firestore: perfiles de usuario y datos personales de los proyectos
 *   (nombre, cédula, carrera, nota). Estos datos NUNCA se escriben en la cadena.
 *
 * La configuración se lee de client/.env (variables VITE_FIREBASE_*).
 * Si faltan, la aplicación funciona en "modo local" con datos de demostración
 * guardados en el navegador, y lo indica en pantalla.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;

if (isFirebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

/** Inicia sesión y devuelve el perfil guardado en users/{uid}. */
export async function firebaseLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (!snap.exists()) {
    throw new Error('La cuenta existe, pero no tiene un perfil institucional en Firestore.');
  }
  return { uid: cred.user.uid, ...snap.data(), authMethod: 'firebase' };
}

/**
 * Registro abierto solo para estudiantes. Los roles "docente" y "admin"
 * los asigna Secretaría desde la base de datos (o con scripts/seed-firebase.js).
 */
export async function firebaseRegisterStudent(email, password, profile) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const data = {
    name: profile.name,
    cedula: profile.cedula,
    email,
    role: 'student',
    faculty: profile.faculty || '',
    facultyId: profile.facultyId || '',
    career: profile.career || '',
    walletAddress: profile.walletAddress || '',
    termsAccepted: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), data);
  return { uid: cred.user.uid, ...data, authMethod: 'firebase' };
}

export function firebaseResetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function firebaseLogout() {
  return auth ? signOut(auth) : Promise.resolve();
}

export function onFirebaseAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

/** Escucha los perfiles visibles para el usuario (admin: todos; resto: solo el propio). */
export function watchUsers(currentUser, callback) {
  if (!db || !currentUser?.uid) return () => {};
  const onErr = (err) => console.warn('Firestore users:', err.message);
  if (currentUser.role === 'admin') {
    return onSnapshot(collection(db, 'users'),
      (snap) => callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))), onErr);
  }
  return onSnapshot(doc(db, 'users', currentUser.uid),
    (d) => callback(d.exists() ? [{ uid: d.id, ...d.data() }] : []), onErr);
}

/** Escucha los datos off-chain de los proyectos (documento = hash SHA-256 del PDF). */
export function watchProjects(callback) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'projects'),
    (snap) => callback(snap.docs.map((d) => ({ docId: d.id, ...d.data() }))),
    (err) => console.warn('Firestore projects:', err.message));
}

export function saveUserProfile(uid, data) {
  const clean = { ...data };
  delete clean.password;
  delete clean.uid;
  return setDoc(doc(db, 'users', uid), clean, { merge: true });
}

export function deleteUserProfile(uid) {
  return deleteDoc(doc(db, 'users', uid));
}

export function saveProjectRecord(docId, data) {
  return setDoc(doc(db, 'projects', docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function deleteProjectRecord(docId) {
  return deleteDoc(doc(db, 'projects', docId));
}

export function addTransactionRecord(data) {
  return addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp() });
}
