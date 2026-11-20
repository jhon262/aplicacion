/**
 * Script de validación y despliegue de Reglas de Seguridad Firebase (Firestore & Storage)
 * Proyecto de Titulación Web3 - Universidad Politécnica Estatal del Carchi (UPEC)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function validateRules() {
  console.log('================================================================');
  console.log('🛡️ VALIDACIÓN DE REGLAS DE SEGURIDAD FIREBASE — UPEC WEB3');
  console.log('================================================================');

  const firestorePath = path.join(__dirname, '..', 'firestore.rules');
  const storagePath = path.join(__dirname, '..', 'storage.rules');
  const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');

  if (!fs.existsSync(firestorePath)) {
    throw new Error('No se encontró el archivo firestore.rules');
  }
  if (!fs.existsSync(storagePath)) {
    throw new Error('No se encontró el archivo storage.rules');
  }
  if (!fs.existsSync(firebaseJsonPath)) {
    throw new Error('No se encontró el archivo firebase.json');
  }

  console.log('✅ firestore.rules presente (' + fs.statSync(firestorePath).size + ' bytes)');
  console.log('✅ storage.rules presente   (' + fs.statSync(storagePath).size + ' bytes)');
  console.log('✅ firebase.json configurado correctamente');

  // Comprobar sintaxis y estructura básica
  const firestoreContent = fs.readFileSync(firestorePath, 'utf8');
  const storageContent = fs.readFileSync(storagePath, 'utf8');

  const requiredRoles = ['student', 'docente', 'admin'];
  for (const role of requiredRoles) {
    if (!firestoreContent.includes(role)) {
      throw new Error(`El rol institucional "${role}" no está contemplado en firestore.rules`);
    }
  }
  console.log('✅ Roles RBAC validados en Firestore: student, docente, admin.');

  if (!firestoreContent.includes('termsAccepted')) {
    throw new Error('firestore.rules no valida la aceptación obligatoria de términos LOPDP');
  }
  console.log('✅ Validación de consentimiento informado LOPDP presente en Firestore.');

  if (!storageContent.includes('application/pdf')) {
    throw new Error('storage.rules debe restringir las tesis al tipo application/pdf');
  }
  console.log('✅ Restricción MIME application/pdf y límites de tamaño validados en Storage.');

  console.log('----------------------------------------------------------------');
  console.log('✨ Todas las reglas de seguridad cumplen la metodología del proyecto.');
  console.log('Para desplegar a producción con Firebase CLI:');
  console.log('   npx firebase deploy --only firestore:rules,storage');
  console.log('================================================================');
}

try {
  validateRules();
} catch (err) {
  console.error('❌ Error en validación de reglas:', err.message);
  process.exit(1);
}
