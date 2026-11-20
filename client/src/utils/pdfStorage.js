/**
 * Almacenamiento local persistente en IndexedDB para archivos PDF de tesis UPEC.
 * Permite que los archivos PDF subidos por los estudiantes se preserven inmutables en el navegador
 * y puedan ser leídos por los docentes y jurado calificador sin depender de gateways lentos.
 */

const DB_NAME = 'UPEC_THESIS_STORAGE';
const STORE_NAME = 'thesis_documents';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda un archivo PDF asociado a una clave (CID de IPFS o ID de proyecto).
 */
export async function savePdfToStorage(key, file) {
  if (!key || !file) return null;
  try {
    const db = await openDB();
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        name: file.name || 'tesis_upec.pdf',
        type: file.type || 'application/pdf',
        size: file.size || arrayBuffer.byteLength,
        buffer: arrayBuffer,
        updatedAt: Date.now(),
      };
      const req = store.put(record, String(key));
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error al guardar PDF en IndexedDB:', err);
    return false;
  }
}

/**
 * Recupera un archivo PDF por su clave (CID o ID de proyecto) devolviendo su Blob y ObjectURL.
 */
export async function getPdfFromStorage(key) {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(key));
      req.onsuccess = () => {
        const record = req.result;
        if (!record || !record.buffer) {
          resolve(null);
          return;
        }
        const blob = new Blob([record.buffer], { type: record.type || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          name: record.name,
          size: record.size,
          updatedAt: record.updatedAt,
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error al recuperar PDF de IndexedDB:', err);
    return null;
  }
}

/**
 * Genera un documento PDF oficial de la UPEC con formato estandarizado si el proyecto aún no cuenta con uno.
 */
export function generateSampleUpecThesisBlob(project = {}) {
  const title = (project.title || 'TRABAJO DE INTEGRACIÓN CURRICULAR WEB3 UPEC').toUpperCase();
  const student = project.studentName || 'Benítez Ruales María José';
  const faculty = project.faculty || 'FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES (FIACA)';
  const career = project.career || 'INGENIERÍA EN COMPUTACIÓN';
  const score = project.score || '9.85';
  const dateStr = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });

  // Crear contenido PDF 1.4 estructuralmente válido
  const pdfLines = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  const streamContent = [
    'BT',
    // Encabezado
    '/F1 16 Tf 50 740 Td (UNIVERSIDAD POLITECNICA ESTATAL DEL CARCHI) Tj',
    '/F1 11 Tf 0 -22 Td (' + faculty.substring(0, 50) + ') Tj',
    '/F2 10 Tf 0 -18 Td (' + career.substring(0, 50) + ' - SISTEMA WEB3) Tj',
    // Línea separadora simulada
    '0 -15 Td (-----------------------------------------------------------------------------------------------------) Tj',
    // Título
    '/F1 13 Tf 0 -35 Td (TRABAJO DE INTEGRACION CURRICULAR DE GRADO) Tj',
    '/F2 11 Tf 0 -22 Td (Tema: "' + title.substring(0, 52) + '") Tj',
    // Autor
    '/F1 11 Tf 0 -30 Td (Autor / Investigador: ' + student.substring(0, 40) + ') Tj',
    '/F2 10 Tf 0 -18 Td (Fecha de Acreditacion: ' + dateStr + ') Tj',
    '/F2 10 Tf 0 -18 Td (Lugar: Tulcan, Carchi, Republica del Ecuador) Tj',
    // Veredicto
    '0 -25 Td (-----------------------------------------------------------------------------------------------------) Tj',
    '/F1 12 Tf 0 -25 Td (VEREDICTO OFICIAL DEL TRIBUNAL CALIFICADOR) Tj',
    '/F1 11 Tf 0 -20 Td (Calificacion de Grado: ' + score + ' / 10.00 PUNTOS (SOBRESALIENTE)) Tj',
    '/F2 10 Tf 0 -18 Td (Quorum de Docentes: 3 de 3 Votos Afirmativos en DAO Institucional) Tj',
    '/F2 10 Tf 0 -18 Td (Estandar Criptografico: Token NFT ERC-721 URIStorage Inmutable) Tj',
    // Abstract
    '0 -25 Td (-----------------------------------------------------------------------------------------------------) Tj',
    '/F1 11 Tf 0 -25 Td (RESUMEN EJECUTIVO Y CERTIFICACION:) Tj',
    '/F2 9.5 Tf 0 -18 Td (El presente documento certifica la presentacion formal y defensa oral de tesis.) Tj',
    '/F2 9.5 Tf 0 -14 Td (Los metadatos se encuentran anclados de forma inmutable en la red IPFS) Tj',
    '/F2 9.5 Tf 0 -14 Td (garantizando fe publica y no-repudio criptografico para las autoridades de la UPEC.) Tj',
    // Firmas
    '0 -40 Td (-------------------------------       -------------------------------       -------------------------------) Tj',
    '/F1 8.5 Tf 0 -14 Td (Ing. Marcelo Cardenas, M.Sc.        Dr. Roberto Davila, Ph.D.          Msc. Silvia Benavides) Tj',
    '/F2 8 Tf 0 -12 Td (   Presidente Tribunal                   Director Tesis                    Vocal Calificador) Tj',
    'ET'
  ].join('\n');

  const streamLength = streamContent.length;
  pdfLines.push(`6 0 obj << /Length ${streamLength} >> stream\n${streamContent}\nendstream endobj`);

  let offset = 0;
  const xref = ['xref', '0 7', '0000000000 65535 f '];
  
  // Calcular offsets aproximados
  for (let i = 0; i < pdfLines.length; i++) {
    xref.push(String(offset).padStart(10, '0') + ' 00000 n ');
    offset += pdfLines[i].length + 1;
  }

  const finalPdf = [
    ...pdfLines,
    xref.join('\n'),
    'trailer << /Size 7 /Root 1 0 R >>',
    'startxref',
    String(offset),
    '%%EOF'
  ].join('\n');

  return new Blob([finalPdf], { type: 'application/pdf' });
}
