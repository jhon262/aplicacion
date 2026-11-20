import {
  isFirebaseEnabled,
  watchUsers,
  watchProjects,
  saveUserProfile,
  deleteUserProfile,
  saveProjectRecord,
  deleteProjectRecord,
  addTransactionRecord,
  auth,
} from './firebase.js';

/**
 * Base de datos off-chain del prototipo.
 *
 * Con Firebase configurado (client/.env), la fuente de verdad es Cloud Firestore:
 *   users/{uid}             perfil institucional (nombre, cédula, rol, carrera, billetera)
 *   projects/{documentHash} datos personales del trabajo (nombre, cédula, carrera, nota)
 *   transactions/{id}       bitácora de transacciones enviadas desde la interfaz
 * Este módulo mantiene una copia en memoria/localStorage para que las vistas
 * puedan leer de forma síncrona, y la actualiza con los listeners de Firestore.
 *
 * El estado académico (pendiente, aprobado, rechazado), los votos y el tribunal
 * NO se guardan aquí: se leen siempre del contrato ProjectRegistry.
 *
 * Sin Firebase, funciona en "modo local" con los datos ficticios de abajo.
 */
export const isLocalMode = !isFirebaseEnabled;

// Datos de demostración (ficticios). Las billeteras son las cuentas 0-4 de Hardhat.
const DEMO_USERS = [
  {
    name: 'Andrade Pérez Luis Fernando',
    cedula: '0400000001',
    email: 'estudiante.demo@upec.edu.ec',
    role: 'student',
    faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
    facultyId: 'fiaca',
    facultyCode: 'FIACA',
    career: 'Carrera de Computación',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    avatar: '👨‍🎓',
    demoPassword: 'demo2026',
  },
  {
    name: 'PhD. Roberto Salazar Mena',
    cedula: '0400000011',
    email: 'docente1.demo@upec.edu.ec',
    role: 'docente',
    faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
    facultyId: 'fiaca',
    facultyCode: 'FIACA',
    career: 'Docente evaluador',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    avatar: '👨‍🏫',
    demoPassword: 'demo2026',
  },
  {
    name: 'MSc. Patricia Guerrón Ortiz',
    cedula: '0400000012',
    email: 'docente2.demo@upec.edu.ec',
    role: 'docente',
    faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
    facultyId: 'fiaca',
    facultyCode: 'FIACA',
    career: 'Docente evaluador',
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    avatar: '👩‍🏫',
    demoPassword: 'demo2026',
  },
  {
    name: 'Ing. Javier Tapia Rosero',
    cedula: '0400000013',
    email: 'docente3.demo@upec.edu.ec',
    role: 'docente',
    faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
    facultyId: 'fiaca',
    facultyCode: 'FIACA',
    career: 'Docente evaluador',
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    avatar: '👨‍🏫',
    demoPassword: 'demo2026',
  },
  {
    name: 'MSc. Gabriela Torres Benavides',
    cedula: '0400000020',
    email: 'secretaria.demo@upec.edu.ec',
    role: 'admin',
    faculty: 'Secretaría General',
    facultyId: 'rectorado',
    facultyCode: 'SG',
    career: 'Secretaría General',
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    avatar: '🏛️',
    demoPassword: 'demo2026',
  },
];

// Datos off-chain de los tres proyectos que crea scripts/preparar-todo.js.
const FIACA = {
  faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
  facultyId: 'fiaca',
  facultyCode: 'FIACA',
  career: 'Carrera de Computación',
  titleName: 'Ingeniero en Ciencias de la Computación',
};
const DEMO_PROJECTS = [
  { documentHash: '0x346faeb44a06b9c4ed2e442ec4119f607314e250298e7b36a687701bb7a01d81', projectId: 1, title: 'Prototipo de registro de títulos con contratos inteligentes', studentName: 'Andrade Pérez Luis Fernando', studentId: '0400000001', score: '9.50', ...FIACA },
  { documentHash: '0xc44423511fc4cb1003c65fe52317fb983484f26193b3221163a684066bbe3cbd', projectId: 2, title: 'Trazabilidad de actas académicas con IPFS', studentName: 'Andrade Pérez Luis Fernando', studentId: '0400000001', score: '9.20', ...FIACA },
  { documentHash: '0x799a50835af88e3f4600dc9e33f77dd4c99b483970f13240defff22ef420611b', projectId: 3, title: 'Verificación pública de certificados mediante código QR', studentName: 'Andrade Pérez Luis Fernando', studentId: '0400000001', score: '9.00', ...FIACA },
];

const STORAGE_KEYS = {
  USERS: 'upec_database_users',
  PROJECTS: 'upec_offchain_projects',
  SETTINGS: 'upec_app_settings',
  TRANSACTIONS: 'upec_database_transactions',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage:', e);
  }
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upec_db_updated'));
}

/** Quita los datos que no deben mostrarse ni sincronizarse (contraseñas de demostración). */
function publicUser(u) {
  if (!u) return u;
  const { demoPassword, password, ...rest } = u;
  return rest;
}

// ==========================================
// SINCRONIZACIÓN CON FIRESTORE
// ==========================================
let unsubscribers = [];

/**
 * Inicia los listeners de Firestore para el usuario autenticado.
 * Devuelve una función para detenerlos (al cerrar sesión).
 */
export function startDatabaseSync(currentUser) {
  stopDatabaseSync();
  if (isLocalMode || !currentUser?.uid) return () => {};
  unsubscribers.push(
    watchUsers(currentUser, (users) => {
      writeJSON(STORAGE_KEYS.USERS, users);
      notify();
    }),
    watchProjects((records) => {
      writeJSON(STORAGE_KEYS.PROJECTS, records);
      notify();
    })
  );
  return stopDatabaseSync;
}

export function stopDatabaseSync() {
  unsubscribers.forEach((u) => u && u());
  unsubscribers = [];
}

/** Borra la copia local (se usa al cerrar sesión con Firebase). */
export function clearLocalCache() {
  try {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  } catch {}
}

/**
 * Base de Datos Local Persistente y Reactiva para la Aplicación UPEC Web3
 * Almacena de forma inmutable y persistente:
 * 1. Usuarios, credenciales, perfiles y roles (Estudiante, Docente, Admin)
 * 2. Proyectos de grado, tesis, CIDs de IPFS, estados DAO, notas y diplomas NFT
 * 3. Opciones de configuración institucional (Paletas de color, temas, accesibilidad, despliegues)
 */

export const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'UPEC Esmeralda Institucional',
    description: 'Verde institucional oficial UPEC con toques dorados de honor',
    primary: '#007A3D',
    primaryHover: '#006230',
    primaryLight: '#ecfdf5',
    primaryBorder: '#a7f3d0',
    accent: '#f59e0b', // Dorado Carchi
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    headerGradient: 'from-emerald-900 via-[#007A3D] to-emerald-800',
    btnPrimary: 'bg-[#007A3D] hover:bg-[#006230] text-white shadow-emerald-900/20',
    ring: 'focus:ring-emerald-500',
    isDark: false,
  },
  blue: {
    id: 'blue',
    name: 'Azul Académico Universitario',
    description: 'Estilo clásico universitario de alta distinción y confianza',
    primary: '#1D4ED8',
    primaryHover: '#1E40AF',
    primaryLight: '#eff6ff',
    primaryBorder: '#bfdbfe',
    accent: '#06b6d4',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
    headerGradient: 'from-slate-900 via-blue-900 to-indigo-900',
    btnPrimary: 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-900/20',
    ring: 'focus:ring-blue-500',
    isDark: false,
  },
  purple: {
    id: 'purple',
    name: 'Púrpura Web3 / Blockchain',
    description: 'Estilo moderno descentralizado con tonos violetas y ciberseguridad',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryLight: '#faf5ff',
    primaryBorder: '#e9d5ff',
    accent: '#ec4899',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-300',
    headerGradient: 'from-slate-950 via-purple-950 to-indigo-950',
    btnPrimary: 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/20',
    ring: 'focus:ring-purple-500',
    isDark: false,
  },
  amber: {
    id: 'amber',
    name: 'Ámbar y Oro Pasto Imperial',
    description: 'Inspirado en la iconografía Sol Pasto del Carchi y excelencia académica',
    primary: '#D97706',
    primaryHover: '#B45309',
    primaryLight: '#fffbeb',
    primaryBorder: '#fde68a',
    accent: '#059669',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
    headerGradient: 'from-amber-950 via-amber-900 to-yellow-900',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20',
    ring: 'focus:ring-amber-500',
    isDark: false,
  },
  dark: {
    id: 'dark',
    name: 'Modo Oscuro Web3 / Terminal',
    description: 'Interfaz oscura de alto contraste con bordes esmeralda neón',
    primary: '#10B981',
    primaryHover: '#059669',
    primaryLight: '#064e3b',
    primaryBorder: '#059669',
    accent: '#38bdf8',
    badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    headerGradient: 'from-black via-slate-950 to-emerald-950',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold shadow-emerald-500/20',
    ring: 'focus:ring-emerald-400',
    isDark: true,
  },
};

const DEFAULT_SETTINGS = {
  themeId: 'emerald',
  fontSize: 'normal', // 'normal', 'large', 'xlarge'
  compactMode: false, // true: comprimido, false: holgado con despliegues
  showCollapsibleGuides: true,
  autoExpandActive: true,
};

// ==========================================
// 1. GESTIÓN DE CONFIGURACIÓN Y TEMA
// ==========================================
export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAppSettings(newSettings) {
  try {
    const current = getAppSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error saving settings:', e);
    return DEFAULT_SETTINGS;
  }
}

// ==========================================
// 2. USUARIOS
// ==========================================
export function getDatabaseUsers() {
  if (isLocalMode) {
    const stored = readJSON(STORAGE_KEYS.USERS, null);
    if (Array.isArray(stored) && stored.length) return stored.map(publicUser);
    writeJSON(STORAGE_KEYS.USERS, DEMO_USERS);
    return DEMO_USERS.map(publicUser);
  }
  return readJSON(STORAGE_KEYS.USERS, []);
}

export function saveDatabaseUser(userData) {
  const clean = publicUser({ ...userData, updatedAt: new Date().toISOString() });
  if (!isLocalMode) {
    const uid = userData.uid || (auth?.currentUser && auth.currentUser.email === userData.email ? auth.currentUser.uid : null);
    if (uid) {
      saveUserProfile(uid, clean).catch((e) => console.warn('Firestore saveUser:', e.message));
    } else {
      console.warn('Para crear usuarios con Firebase use el registro o scripts/seed-firebase.js.');
    }
  }
  const users = isLocalMode ? readJSON(STORAGE_KEYS.USERS, DEMO_USERS) : getDatabaseUsers();
  const idx = users.findIndex((u) => u.email?.toLowerCase() === clean.email?.toLowerCase());
  const updated = [...users];
  if (idx >= 0) updated[idx] = { ...updated[idx], ...clean };
  else updated.push(clean);
  writeJSON(STORAGE_KEYS.USERS, updated);
  notify();
  return clean;
}

export function deleteDatabaseUser(identifier) {
  const idStr = String(identifier).trim().toLowerCase();
  const users = isLocalMode ? readJSON(STORAGE_KEYS.USERS, DEMO_USERS) : getDatabaseUsers();
  const target = users.find((u) => u.email?.toLowerCase() === idStr || String(u.cedula).toLowerCase() === idStr);
  if (!isLocalMode && target?.uid) {
    deleteUserProfile(target.uid).catch((e) => console.warn('Firestore deleteUser:', e.message));
  }
  const filtered = users.filter((u) => u !== target);
  writeJSON(STORAGE_KEYS.USERS, filtered);
  notify();
  return filtered.map(publicUser);
}

/** Solo en modo local (sin Firebase): valida contra los usuarios de demostración. */
export function authenticateDatabaseUser(identifier, password) {
  if (!isLocalMode) return null;
  const idStr = String(identifier).trim().toLowerCase();
  const users = readJSON(STORAGE_KEYS.USERS, DEMO_USERS);
  const user = users.find(
    (u) => (u.email?.toLowerCase() === idStr || String(u.cedula).toLowerCase() === idStr) &&
      (u.demoPassword || 'demo2026') === String(password).trim()
  );
  return user ? publicUser(user) : null;
}

// ==========================================
// 3. DATOS OFF-CHAIN DE LOS PROYECTOS
// ==========================================
// Cada registro se identifica por el hash SHA-256 del PDF, el mismo que guarda el contrato.
export function getDatabaseProjects() {
  if (isLocalMode) {
    const stored = readJSON(STORAGE_KEYS.PROJECTS, null);
    if (Array.isArray(stored)) return stored;
    writeJSON(STORAGE_KEYS.PROJECTS, DEMO_PROJECTS);
    return DEMO_PROJECTS;
  }
  return readJSON(STORAGE_KEYS.PROJECTS, []);
}

/** Busca el registro off-chain de un proyecto on-chain (por hash del PDF o por ID). */
export function findProjectRecord(onChainProject, records = getDatabaseProjects()) {
  if (!onChainProject) return null;
  const hash = String(onChainProject.documentHash || '').toLowerCase();
  return (
    records.find((r) => hash && String(r.documentHash || r.docId || '').toLowerCase() === hash) ||
    records.find((r) => Number(r.projectId) === Number(onChainProject.id)) ||
    null
  );
}

const ON_CHAIN_FIELDS = ['status', 'votesFor', 'votesAgainst', 'votingDeadline', 'certificateId', 'voters', 'submitter', 'ipfsMetadataCID', 'description'];

export function saveDatabaseProject(projectData) {
  const documentHash = String(projectData.documentHash || '').toLowerCase();
  if (!documentHash) throw new Error('Falta el hash del PDF para guardar los datos del proyecto.');
  const record = { ...projectData, documentHash };
  ON_CHAIN_FIELDS.forEach((f) => delete record[f]);
  record.updatedAt = new Date().toISOString();

  if (!isLocalMode) {
    const existing = getDatabaseProjects().find((r) => String(r.documentHash).toLowerCase() === documentHash);
    if (auth?.currentUser) record.ownerUid = existing?.ownerUid || record.ownerUid || auth.currentUser.uid;
    saveProjectRecord(documentHash, record).catch((e) => console.warn('Firestore saveProject:', e.message));
  }
  const list = getDatabaseProjects();
  const idx = list.findIndex((r) => String(r.documentHash).toLowerCase() === documentHash);
  const updated = [...list];
  if (idx >= 0) updated[idx] = { ...updated[idx], ...record };
  else updated.unshift(record);
  writeJSON(STORAGE_KEYS.PROJECTS, updated);
  notify();
  return record;
}

/**
 * Elimina los datos personales de un proyecto (derecho de eliminación, LOPDP art. 15).
 * El registro en la cadena permanece, pero su hash ya no se puede vincular con la persona.
 */
export function deleteDatabaseProject(projectRef) {
  const list = getDatabaseProjects();
  const ref = String(projectRef).toLowerCase();
  const target = list.find((r) => String(r.documentHash).toLowerCase() === ref || String(r.projectId) === ref);
  if (!target) return list;
  if (!isLocalMode) {
    deleteProjectRecord(target.documentHash).catch((e) => console.warn('Firestore deleteProject:', e.message));
  }
  const filtered = list.filter((r) => r !== target);
  writeJSON(STORAGE_KEYS.PROJECTS, filtered);
  notify();
  return filtered;
}

export function resetDatabaseToDefaults() {
  if (!isLocalMode) return false; // con Firebase no se borra la base institucional desde la interfaz
  writeJSON(STORAGE_KEYS.USERS, DEMO_USERS);
  writeJSON(STORAGE_KEYS.PROJECTS, DEMO_PROJECTS);
  writeJSON(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  notify();
  return true;
}

// ==========================================
// 4. HISTORIAL INMUTABLE DE TRANSACCIONES AUDITABLES
// ==========================================
export function getDatabaseTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading transactions from storage:', e);
  }
  return [];
}

export function saveDatabaseTransaction(tx) {
  if (!tx || !tx.hash) return null;
  const list = getDatabaseTransactions();
  
  // Evitar duplicados por hash
  const existingIdx = list.findIndex(
    (item) => item.hash.toLowerCase() === tx.hash.toLowerCase()
  );

  const cleanTx = {
    id: tx.hash,
    hash: tx.hash,
    type: tx.type || 'Transacción Web3', // 'FAUCET_UPECT', 'TRANSFER_UPECT', 'ESCROW_CREATE', 'ESCROW_DEPOSIT', 'ESCROW_DELIVERY', 'ESCROW_RELEASE', 'DISPUTE_RAISE', 'DISPUTE_RESOLVE', 'NFT_REGISTER', 'DAO_VOTE'
    module: tx.module || 'Blockchain',
    from: tx.from || '0x0000000000000000000000000000000000000000',
    to: tx.to || null,
    amount: tx.amount || null,
    token: tx.token || 'ETH',
    description: tx.description || 'Operación confirmada en bloque',
    status: tx.status || 'Confirmed', // 'Confirmed', 'Pending', 'Failed'
    blockNumber: tx.blockNumber || null,
    gasUsed: tx.gasUsed || null,
    timestamp: tx.timestamp || new Date().toISOString(),
    details: tx.details || {},
  };

  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...list];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...cleanTx };
  } else {
    // Más reciente primero
    updatedList = [cleanTx, ...list];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedList.slice(0, 100))); // Mantener últimas 100
  } catch (e) {
    console.warn('Error saving transaction to storage:', e);
  }

  if (!isLocalMode && auth?.currentUser) {
    addTransactionRecord({ ...cleanTx, uid: auth.currentUser.uid }).catch((e) => console.warn('Firestore tx:', e.message));
  }

  // Despachar evento para sincronización reactiva en tiempo real en la UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('upec_tx_updated', { detail: cleanTx }));
  }

  return cleanTx;
}

export function clearDatabaseTransactions() {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('upec_tx_updated', { detail: null }));
    }
    return true;
  } catch {
    return false;
  }
}

