import QRCode from 'qrcode';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Edit3,
  Sliders,
  HelpCircle,
  Eye,
  EyeOff,
  PenTool,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * UPECDiplomaDocument
 * Réplica fiel del Título Oficial de Grado de la Universidad Politécnica Estatal del Carchi (UPEC).
 * Permite escribir y personalizar en tiempo real: Nombre, Título de Ingeniería, Cédula,
 * Carrera, Facultad, Lugar/Fecha/Año, y alternar la visibilidad de las firmas institucionales.
 */
export default function UPECDiplomaDocument({
  project,
  isPrintMode = false,
  onOpenEditModal = null,
}) {
  const [copied, setCopied] = useState(false);

  if (!project) return null;

  // Helpers para resolver valores iniciales
  const resolveInitialTitle = (p) => {
    if (p.titleName) return p.titleName;
    if (p.career && p.career.toLowerCase().includes('agropecuaria')) return 'Ingeniera Agropecuaria';
    if (p.career && p.career.toLowerCase().includes('computación')) return 'Ingeniero en Ciencias de la Computación';
    if (p.contractType === 'posgrado') return 'Magíster en Inteligencia Artificial y Ciberseguridad';
    if (p.contractType === 'pasantias') return 'Acreditación de Prácticas Pre-Profesionales';
    if (p.contractType === 'merito') return 'Condecoración Sol Pasto de Oro';
    return p.title || 'Ingeniero en Ciencias de la Computación';
  };

  const resolveInitialCareer = (p) => {
    if (p.career && p.career.toLowerCase().includes('agropecuaria')) return 'CARRERA DE AGROPECUARIA';
    if (p.career && p.career.toLowerCase().includes('computación')) return 'CARRERA DE COMPUTACIÓN';
    if (p.career) {
      return p.career.toUpperCase().startsWith('CARRERA')
        ? p.career.toUpperCase()
        : `CARRERA DE ${p.career.toUpperCase()}`;
    }
    return 'CARRERA DE COMPUTACIÓN';
  };

  // Dirección de cada integrante del tribunal (leída del contrato) y QR de verificación pública
  const tribunalAddr = (i) => project.tribunal?.[i]?.address || '';
  const shortAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : 'sin asignar');
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const base = import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!project?.id) return;
    QRCode.toDataURL(`${base}/?verify=${project.id}`, { margin: 1, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [project?.id]);

  // Estados editables en vivo con datos representativos modificables
  const [studentName, setStudentName] = useState(() => project.studentName || 'Andrade Pérez Luis Fernando');
  const [studentId, setStudentId] = useState(() => project.studentId || '0400000001');
  const [titleAwarded, setTitleAwarded] = useState(() => resolveInitialTitle(project));
  const [careerName, setCareerName] = useState(() => resolveInitialCareer(project));
  const [facultyName, setFacultyName] = useState(() => (project.faculty || 'FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES').toUpperCase());
  const [diplomaDate, setDiplomaDate] = useState(() => project.date || project.timestamp || 'Tulcán, noviembre de 2026');

  // Modo de Firmas:
  // 'official': Con firmas cursivas humanas y sellos circulares húmedos oficiales UPEC (idéntico a la foto física)
  // 'code': Con firmas de código criptográfico ECDSA / Hashes de la Blockchain (Tribunal DAO)
  // 'blank': Con líneas formales listas para firmar físicamente a mano con esfero / pluma
  // 'none': Ocultar completamente la sección de firmas
  const [signatureMode, setSignatureMode] = useState('official');
  const [showLegalExplanation, setShowLegalExplanation] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);

  // Nombres de Autoridades Firmantes
  const [rectorName, setRectorName] = useState('Jorge Iván Mina Ortega Ph.D.');
  const [rectorTitle, setRectorTitle] = useState('RECTOR');
  const [secretaryName, setSecretaryName] = useState('MSc. Gabriela Torres Benavides');
  const [secretaryTitle, setSecretaryTitle] = useState('SECRETARIA GENERAL (E)');

  // Sincronización cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (project) {
      setStudentName(project.studentName || 'Andrade Pérez Luis Fernando');
      setStudentId(project.studentId || '0400000001');
      setTitleAwarded(resolveInitialTitle(project));
      setCareerName(resolveInitialCareer(project));
      setFacultyName((project.faculty || 'FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES').toUpperCase());
      setDiplomaDate(project.date || project.timestamp || 'Tulcán, noviembre de 2026');
    }
  }, [project]);

  const handleResetToDefault = () => {
    if (project) {
      setStudentName(project.studentName || 'Andrade Pérez Luis Fernando');
      setStudentId(project.studentId || '0400000001');
      setTitleAwarded(resolveInitialTitle(project));
      setCareerName(resolveInitialCareer(project));
      setFacultyName((project.faculty || 'FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES').toUpperCase());
      setDiplomaDate(project.date || project.timestamp || 'Tulcán, noviembre de 2026');
      setSignatureMode('official');
      setRectorName('Jorge Iván Mina Ortega Ph.D.');
      setRectorTitle('RECTOR');
      setSecretaryName('MSc. Gabriela Torres Benavides');
      setSecretaryTitle('SECRETARIA GENERAL (E)');
    }
  };

  const handleCopyHash = () => {
    if (project.ipfsMetadataCID) {
      navigator.clipboard.writeText(project.ipfsMetadataCID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">

      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE EDICIÓN EN VIVO Y CONTROL DE FIRMAS (NO SE IMPRIME)     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[850px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        
        {/* Cabecera del Panel de Control */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#007A3D]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Personalización y Edición en Vivo del Título</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Modo Interactivo
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Puedes escribir los datos aquí o hacer clic directo sobre el texto del diploma para editar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center space-x-1"
              title="Restablecer a los datos originales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
              title={isEditorExpanded ? 'Plegar controles' : 'Desplegar controles'}
            >
              {isEditorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Formulario de Campos Editables */}
        {isEditorExpanded && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            
            {/* Fila 1: Nombre del Graduando y Cédula */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Nombre Completo del Graduando:
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ej: YESENIA ALEXANDRA CHITAN PIARPUEZAN"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Cédula de Identidad (C.C):
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ej: 0401936653"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-bold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fila 2: Título de Ingeniería Conferido y Carrera */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Título Conferido (Se mostrará en letra Gótica Fraktur):
                </label>
                <input
                  type="text"
                  value={titleAwarded}
                  onChange={(e) => setTitleAwarded(e.target.value)}
                  placeholder="Ej: Ingeniera Agropecuaria / Ingeniero en Computación"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Carrera Universitaria:
                </label>
                <input
                  type="text"
                  value={careerName}
                  onChange={(e) => setCareerName(e.target.value)}
                  placeholder="Ej: CARRERA DE AGROPECUARIA"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fila 3: Facultad y Lugar/Fecha/Año */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Facultad Académica:
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="Ej: FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Lugar, Fecha y Año de Expedición:
                </label>
                <input
                  type="text"
                  value={diplomaDate}
                  onChange={(e) => setDiplomaDate(e.target.value)}
                  placeholder="Ej: Tulcán, 15 de mayo de 2025"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:border-[#007A3D] focus:ring-1 focus:ring-[#007A3D] focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN INTERACTIVA: CONTROL DE FIRMAS (RESPONDE A TU PREGUNTA)           */}
            {/* ========================================================================= */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    ¿Mostrar u Ocultar Firmas de Autoridades?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLegalExplanation(!showLegalExplanation)}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 text-[11px] font-bold underline"
                    title="Explicación legal y Web3 sobre las firmas"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>¿Tienen que estar ahí o no?</span>
                  </button>
                </div>
              </div>

              {/* Botones de Selección del Modo de Firmas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureMode('official')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                    signatureMode === 'official'
                      ? 'border-[#007A3D] bg-emerald-50/80 text-emerald-950 ring-1 ring-[#007A3D]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Eye className="w-4 h-4 text-[#007A3D] shrink-0" />
                  <div>
                    <span className="block font-bold text-xs">Firmas y Sellos Oficiales</span>
                    <span className="block text-[10px] text-slate-500">Rector y Secretaría (idéntico a la foto)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('code')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                    signatureMode === 'code'
                      ? 'border-teal-600 bg-teal-50/80 text-teal-950 ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <span className="block font-bold text-xs">Firmas de Código Web3</span>
                    <span className="block text-[10px] text-slate-500">Hashes ECDSA 0x... del Tribunal On-Chain</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('blank')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                    signatureMode === 'blank'
                      ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-1 ring-amber-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <PenTool className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="block font-bold text-xs">Líneas para Firma Física</span>
                    <span className="block text-[10px] text-slate-500">Sin sellos; listo para firmar con esfero</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('none')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                    signatureMode === 'none'
                      ? 'border-rose-500 bg-rose-50/80 text-rose-950 ring-1 ring-rose-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <EyeOff className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-xs">Ocultar Firmas</span>
                    <span className="block text-[10px] text-slate-500">Espacio limpio sin bloque de firmas</span>
                  </div>
                </button>
              </div>

              {/* Cuadro Explicativo sobre la Validez Legal y Web3 de las Firmas */}
              {showLegalExplanation && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 space-y-2 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                    <Info className="w-4 h-4" />
                    <span>¿Las firmas tienen que ser el código o las firmas de personas?</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                    <li>
                      <strong>En un título físico real de la UPEC (Ley LOES del Ecuador):</strong> Deben ser las <strong>firmas de las autoridades</strong> (Rector y Secretaría General) con sus sellos oficiales húmedos. Un documento físico sin firmas ni sellos no tiene validez legal ante SENESCYT.
                    </li>
                    <li>
                      <strong>En la arquitectura Web3 (Blockchain):</strong> La firma que hace que el título sea <strong>infalsificable</strong> es el <strong>código criptográfico (Firma ECDSA secp256k1)</strong> emitido por las llaves privadas del Tribunal Docente, el cual queda sellado en el bloque del Smart Contract y en el Token NFT ERC-721.
                    </li>
                    <li>
                      <strong>En este prototipo académico puedes elegir ambos:</strong>
                      <br />• Elige <strong>"Firmas y Sellos Oficiales"</strong> para que se vea idéntico al diploma físico de tu foto.
                      <br />• Elige <strong>"Firmas de Código Web3"</strong> si quieres demostrarle a tus profesores cómo se ven los hashes criptográficos on-chain en el documento.
                      <br />• Elige <strong>"Líneas para Firma Física"</strong> para imprimirlo y firmarlo a mano con esfero.
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CONTENEDOR DEL DIPLOMA (MARCO NEGRO REFINADO, DELGADO Y ELEGANTE)         */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[850px] p-1.5 sm:p-2 bg-slate-950 rounded-xl shadow-xl border border-slate-800 print:bg-white print:p-0 print:border-none print:shadow-none print:max-w-none">

        {/* ========================================================================= */}
        {/* HOJA OFICIAL DEL TÍTULO DE GRADO UPEC (Proporción y diagramación idéntica) */}
        {/* ========================================================================= */}
        <div
          id="upec-official-certificate-sheet"
          className="relative bg-[#FAFAF8] text-slate-900 shadow-sm overflow-hidden select-none border-2 border-slate-900 rounded-xs min-h-[1020px] print:min-h-0 print:border-none print:shadow-none"
        >
          {/* Filete Interior Académico Fino (Doble Marco Clásico de Grado Universitario) */}
          <div className="absolute inset-2 sm:inset-3 border border-slate-400/70 pointer-events-none z-10 rounded-2xs" />

          {/* MARCA DE AGUA GUILLOCHÉ CENTRAL DE FONDO CON EL LOGO UPEC */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.038] pointer-events-none select-none z-0">
            <svg viewBox="0 0 500 500" className="w-[500px] h-[500px]">
              <circle cx="250" cy="250" r="230" fill="none" stroke="#007A3D" strokeWidth="2" strokeDasharray="3 3"/>
              <circle cx="250" cy="250" r="200" fill="none" stroke="#D97706" strokeWidth="3"/>
              <circle cx="250" cy="250" r="170" fill="none" stroke="#007A3D" strokeWidth="1"/>
              <circle cx="250" cy="250" r="140" fill="none" stroke="#007A3D" strokeWidth="2" strokeDasharray="6 4"/>
              <circle cx="250" cy="250" r="110" fill="none" stroke="#D97706" strokeWidth="2"/>
            </svg>
            <img
              src="/upec-logo.png"
              alt="Marca de agua UPEC"
              className="absolute w-[360px] h-[360px] object-contain grayscale"
            />
          </div>

          {/* FRANJAS VERDES VERTICALES INSTITUCIONALES EN EL MARGEN IZQUIERDO */}
          <div className="absolute top-0 bottom-0 left-6 sm:left-10 flex gap-2 z-10 pointer-events-none">
            {/* Franja ancha verde bosque */}
            <div className="w-4 sm:w-5 bg-[#006B38] h-full shadow-xs" />
            {/* Franja fina verde bosque */}
            <div className="w-1.5 sm:w-2 bg-[#006B38] h-full shadow-xs" />
          </div>

          {/* ========================================================================= */}
          {/* SELLO DORADO NOTARIAL GRANDE TROQUELADO EN RELIEVE (IDÉNTICO A LA FOTO)   */}
          {/* ========================================================================= */}
          <div className="absolute bottom-8 sm:bottom-10 left-0 sm:left-2 md:left-3 z-30 pointer-events-none flex flex-col items-center">
            {/* Medallón Notarial de Oro Radiante Grande con 32 puntas troqueladas */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center filter drop-shadow-xl select-none">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <defs>
                  {/* Gradiente de Oro Puro Notarial con Reflejos Especulares */}
                  <radialGradient id="goldSealLuster" cx="36%" cy="32%" r="68%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="12%" stopColor="#FFF9C4" />
                    <stop offset="26%" stopColor="#FDE047" />
                    <stop offset="48%" stopColor="#EAB308" />
                    <stop offset="70%" stopColor="#CA8A04" />
                    <stop offset="88%" stopColor="#A16207" />
                    <stop offset="100%" stopColor="#713F12" />
                  </radialGradient>

                  {/* Bisel Metálico Dorado Angular */}
                  <linearGradient id="goldSealBevel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFBEB" />
                    <stop offset="25%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#CA8A04" />
                    <stop offset="75%" stopColor="#FEF08A" />
                    <stop offset="100%" stopColor="#78350F" />
                  </linearGradient>

                  {/* Cúpula Central en Oro Radiante */}
                  <radialGradient id="goldSealDome" cx="38%" cy="34%" r="62%">
                    <stop offset="0%" stopColor="#FFFDE7" />
                    <stop offset="22%" stopColor="#FEF08A" />
                    <stop offset="50%" stopColor="#EAB308" />
                    <stop offset="78%" stopColor="#B45309" />
                    <stop offset="100%" stopColor="#78350F" />
                  </radialGradient>

                  {/* Filtro de Relieve Repujado 3D */}
                  <filter id="goldReliefFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="0.6" floodColor="#451A03" floodOpacity="0.8" />
                  </filter>

                  {/* Arcos Curvados para Texto Interior Sin Salirse de las Puntas */}
                  <path id="sealTextArcTop" d="M 27 50 A 34.5 34.5 0 0 1 93 50" fill="none" />
                  <path id="sealTextArcBottom" d="M 27 70 A 34.5 34.5 0 0 0 93 70" fill="none" />
                </defs>

                {/* 32 Puntas Dentadas Matemáticamente Perfectas y Radialmente Simétricas */}
                <path
                  d="M 60.0 2.0 L 64.8 11.24 L 71.32 3.11 L 74.22 13.11 L 82.2 6.41 L 83.1 16.79 L 92.22 11.77 L 91.09 22.12 L 101.01 18.99 L 97.88 28.91 L 108.23 27.78 L 103.21 36.9 L 113.59 37.8 L 106.89 45.78 L 116.89 48.68 L 108.76 55.2 L 118.0 60.0 L 108.76 64.8 L 116.89 71.32 L 106.89 74.22 L 113.59 82.2 L 103.21 83.1 L 108.23 92.22 L 97.88 91.09 L 101.01 101.01 L 91.09 97.88 L 92.22 108.23 L 83.1 103.21 L 82.2 113.59 L 74.22 106.89 L 71.32 116.89 L 64.8 108.76 L 60.0 118.0 L 55.2 108.76 L 48.68 116.89 L 45.78 106.89 L 37.8 113.59 L 36.9 103.21 L 27.78 108.23 L 28.91 97.88 L 18.99 101.01 L 22.12 91.09 L 11.77 92.22 L 16.79 83.1 L 6.41 82.2 L 13.11 74.22 L 3.11 71.32 L 11.24 64.8 L 2.0 60.0 L 11.24 55.2 L 3.11 48.68 L 13.11 45.78 L 6.41 37.8 L 16.79 36.9 L 11.77 27.78 L 22.12 28.91 L 18.99 18.99 L 28.91 22.12 L 27.78 11.77 L 36.9 16.79 L 37.8 6.41 L 45.78 13.11 L 48.68 3.11 L 55.2 11.24 Z"
                  fill="url(#goldSealLuster)"
                  stroke="url(#goldSealBevel)"
                  strokeWidth="1.2"
                />

                {/* Borde Exterior del Disco Notarial */}
                <circle cx="60" cy="60" r="47.5" fill="none" stroke="#CA8A04" strokeWidth="0.8" />
                <circle cx="60" cy="60" r="46.5" fill="none" stroke="#FFFBEB" strokeWidth="0.6" opacity="0.9" />

                {/* Doble Anillo Concéntrico de Perlas / Puntos Repujados en Oro */}
                <circle cx="60" cy="60" r="44" fill="none" stroke="#FFFDE7" strokeWidth="1.3" strokeDasharray="1.2 2.4" />
                <circle cx="60" cy="60" r="41.5" fill="none" stroke="#78350F" strokeWidth="0.8" />
                <circle cx="60" cy="60" r="39.5" fill="none" stroke="#FFFBEB" strokeWidth="1.1" strokeDasharray="1 2.2" />
                <circle cx="60" cy="60" r="37.5" fill="none" stroke="#92400E" strokeWidth="0.8" />

                {/* Texto Curvado Institucional Siguiendo Perfectamente el Arco Interior */}
                <text fill="#6B3407" fontSize="3.1" fontWeight="900" fontFamily="Cinzel, serif" letterSpacing="0.7">
                  <textPath href="#sealTextArcTop" startOffset="50%" textAnchor="middle">
                    UNIVERSIDAD POLITÉCNICA
                  </textPath>
                </text>
                <text fill="#6B3407" fontSize="3.1" fontWeight="900" fontFamily="Cinzel, serif" letterSpacing="0.7">
                  <textPath href="#sealTextArcBottom" startOffset="50%" textAnchor="middle">
                    ESTATAL DEL CARCHI
                  </textPath>
                </text>

                {/* Puntos Separadores en Relieve */}
                <circle cx="28" cy="60" r="1.2" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />
                <circle cx="92" cy="60" r="1.2" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />

                {/* Cúpula Central en Relieve 3D */}
                <circle cx="60" cy="60" r="28" fill="url(#goldSealDome)" stroke="#92400E" strokeWidth="1" filter="url(#goldReliefFilter)" />
                <circle cx="60" cy="60" r="26" fill="none" stroke="#FFFDE7" strokeWidth="0.9" strokeDasharray="1 1.8" />
                <circle cx="60" cy="60" r="22.5" fill="none" stroke="#78350F" strokeWidth="0.8" />

                {/* Emblema Central Sol Pasto UPEC en Oro Repujado */}
                <g transform="translate(60, 60)" filter="url(#goldReliefFilter)">
                  {/* Disco central de fondo en relieve */}
                  <circle cx="0" cy="0" r="17" fill="url(#goldSealLuster)" stroke="#FFFDE7" strokeWidth="0.8" />
                  
                  {/* Cuatro Pétalos Curvos del Sol Pasto en Oro Brillante */}
                  <path d="M -11 -4 Q 0 -13 11 -4 Q 0 -1 0 0 Z" fill="#FFFDE7" opacity="0.95" />
                  <path d="M 4 -11 Q 13 0 4 11 Q 1 0 0 0 Z" fill="#FFFDE7" opacity="0.95" />
                  <path d="M 11 4 Q 0 13 -11 4 Q 0 1 0 0 Z" fill="#FFFDE7" opacity="0.95" />
                  <path d="M -4 11 Q -13 0 -4 -11 Q -1 0 0 0 Z" fill="#FFFDE7" opacity="0.95" />

                  {/* 4 Puntas Diagonales Secundarias */}
                  <path d="M -7 -7 L 0 -2 L 7 -7 L 2 0 L 7 7 L 0 2 L -7 7 L -2 0 Z" fill="#CA8A04" opacity="0.75" />

                  {/* Núcleo Central y Eje del Símbolo */}
                  <circle cx="0" cy="0" r="5.5" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.9" />
                  <circle cx="0" cy="0" r="2.8" fill="#78350F" />
                  <circle cx="0" cy="0" r="1.2" fill="#FFFDE7" />

                  {/* Cuatro Perlas Cardinales en Relieve */}
                  <circle cx="0" cy="-12.5" r="1.5" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="12.5" cy="0" r="1.5" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="0" cy="12.5" r="1.5" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="-12.5" cy="0" r="1.5" fill="#FFFDE7" stroke="#78350F" strokeWidth="0.4" />
                </g>
              </svg>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BANDA TRICOLOR INSTITUCIONAL COMPLETA HASTA EL FINAL (IDÉNTICA A LA FOTO) */}
          {/* ========================================================================= */}
          <div className="absolute bottom-14 sm:bottom-16 left-0 right-0 w-full h-11 sm:h-12 pointer-events-none z-20 overflow-hidden">
            <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="w-full h-full filter drop-shadow-xs">
              {/* Franja Verde Superior Institucional */}
              <path
                d="M 115 33 C 230 43, 440 28, 700 20 C 820 16, 920 14, 1000 13 L 1000 19 C 920 20, 820 22, 700 26 C 440 34, 230 47, 115 35 Z"
                fill="#006B38"
              />
              {/* Franja Amarilla Central Institucional */}
              <path
                d="M 115 35 C 230 47, 440 34, 700 26 C 820 22, 920 20, 1000 19 L 1000 25 C 920 26, 820 28, 700 32 C 440 40, 230 51, 115 37 Z"
                fill="#FFD100"
              />
              {/* Franja Roja Inferior Institucional */}
              <path
                d="M 115 37 C 230 51, 440 40, 700 32 C 820 28, 920 26, 1000 25 L 1000 31 C 920 32, 820 34, 700 38 C 440 46, 230 55, 115 39 Z"
                fill="#ED1C24"
              />
            </svg>
          </div>

          {/* ========================================================================= */}
          {/* CUERPO PRINCIPAL DEL DIPLOMA (TEXTOS, JERARQUÍA Y CALIGRAFÍA OFICIAL)     */}
          {/* ========================================================================= */}
          <div className="relative z-20 min-h-[1020px] pt-8 sm:pt-10 pb-3 sm:pb-4 px-6 sm:px-14 sm:pl-28 flex flex-col items-center text-center space-y-3 sm:space-y-4 print:min-h-0 print:pt-4 print:pb-2 print:space-y-2">
            
            {/* FILA SUPERIOR: LOGO UPEC A LA IZQUIERDA, ESCUDO NACIONAL AL CENTRO Y BADGE NFT A LA DERECHA */}
            <div className="w-full grid grid-cols-3 items-center mb-1">
              {/* Escudo Circular Oficial UPEC a la Izquierda */}
              <div className="flex justify-start items-center">
                <img
                  src="/upec-logo.png"
                  alt="Escudo Oficial UPEC"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xs"
                />
              </div>

              {/* Escudo de Armas de la República del Ecuador en el Centro (Compacto y sin tapar texto) */}
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/escudo-ecuador.png"
                  alt="Escudo de Armas de la República del Ecuador"
                  className="object-contain drop-shadow-xs select-none"
                  style={{ maxHeight: '68px', maxWidth: '64px', width: 'auto', height: 'auto' }}
                />
              </div>

              {/* Espacio Simétrico a la derecha: Código de Registro NFT / Web3 */}
              <div className="flex justify-end items-center">
                <div className="text-right text-[9px] font-mono text-slate-500 bg-white/80 px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                  <span className="block text-[8px] uppercase tracking-wider text-emerald-800 font-bold">NFT ERC-721</span>
                  <span>#{project.certificateId || project.id || 1}</span>
                </div>
              </div>
            </div>

            {/* ENCABEZADO FORMAL DE LA REPÚBLICA */}
            <div className="space-y-0.5 pt-1">
              <h4 className="font-diploma-cinzel text-xs sm:text-sm font-black tracking-[0.22em] text-slate-900 uppercase">
                REPÚBLICA DEL ECUADOR
              </h4>
              <p className="font-diploma-cinzel text-[9.5px] sm:text-[11px] font-bold tracking-[0.18em] text-slate-700 uppercase">
                EN SU NOMBRE Y POR AUTORIDAD DE LA LEY
              </p>
            </div>

            {/* NOMBRE INSTITUCIONAL DE LA UNIVERSIDAD */}
            <div className="pt-1 pb-1">
              <h1 className="font-diploma-cinzel text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-slate-950 uppercase leading-snug">
                UNIVERSIDAD POLITÉCNICA<br />ESTATAL DEL CARCHI
              </h1>
            </div>

            {/* FACULTAD ACADÉMICA (EDITABLE EN LÍNEA) */}
            <div className="w-full max-w-2xl px-2">
              <input
                type="text"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value.toUpperCase())}
                className="font-diploma-cinzel text-xs sm:text-sm font-bold tracking-wide text-slate-800 uppercase text-center bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none w-full transition-colors print:border-none print:bg-transparent"
                title="Haz clic para modificar la facultad"
              />
            </div>

            {/* CARRERA (EDITABLE EN LÍNEA) */}
            <div className="w-full max-w-xl px-2 pt-0.5">
              <input
                type="text"
                value={careerName}
                onChange={(e) => setCareerName(e.target.value.toUpperCase())}
                className="font-diploma-cinzel text-xs sm:text-sm font-extrabold tracking-wider text-slate-900 uppercase text-center bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none w-full transition-colors print:border-none print:bg-transparent"
                title="Haz clic para escribir la carrera directamente"
              />
            </div>

            {/* CONFIERE EL TÍTULO DE */}
            <div className="pt-2">
              <span className="font-diploma-cinzel text-[10.5px] sm:text-xs font-bold tracking-[0.25em] text-slate-700 uppercase">
                CONFIERE EL TÍTULO DE
              </span>
            </div>

            {/* TÍTULO OFICIAL EN CALIGRAFÍA GÓTICA FRAKTUR (EDITABLE EN LÍNEA - COMPLETO Y SIN CORTES) */}
            <div className="w-full max-w-4xl px-1 sm:px-4 py-0.5 flex justify-center">
              <input
                type="text"
                value={titleAwarded}
                onChange={(e) => setTitleAwarded(e.target.value)}
                className={`font-diploma-gothic font-normal text-slate-900 tracking-wide text-center bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none w-full transition-colors print:border-none print:bg-transparent ${
                  titleAwarded.length > 32
                    ? 'text-xl sm:text-2xl lg:text-[31px] print:text-[27px]'
                    : titleAwarded.length > 24
                    ? 'text-2xl sm:text-3xl lg:text-[36px] print:text-[30px]'
                    : 'text-3xl sm:text-4xl lg:text-[44px] print:text-[34px]'
                }`}
                placeholder="Ingeniero en Ciencias de la Computación"
                title="Haz clic aquí para escribir el título o ingeniería directamente"
              />
            </div>

            {/* PREPOSICIÓN "a:" */}
            <div>
              <span className="font-diploma-cinzel text-xs sm:text-sm font-bold text-slate-700">
                a:
              </span>
            </div>

            {/* NOMBRE COMPLETO DEL GRADUANDO EN ROJO BORGOÑA / LADRILLO (EDITABLE EN LÍNEA) */}
            <div className="w-full max-w-2xl px-2 space-y-1">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.toUpperCase())}
                className="font-diploma-cinzel text-xl sm:text-2xl lg:text-[27px] font-black tracking-wide text-[#991B1B] uppercase text-center bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none w-full transition-colors print:border-none print:bg-transparent"
                placeholder="NOMBRE DEL GRADUANDO"
                title="Haz clic aquí para escribir el nombre del graduando directamente"
              />
              
              {/* CÉDULA DE IDENTIDAD (EDITABLE EN LÍNEA) */}
              <div className="flex items-center justify-center font-diploma-cinzel text-[11px] sm:text-xs font-bold text-slate-800 tracking-wider">
                <span>C.C &nbsp;</span>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none font-mono font-bold text-slate-900 text-center w-36 transition-colors print:border-none print:bg-transparent"
                  placeholder="0401936653"
                  title="Haz clic aquí para modificar la cédula"
                />
              </div>
            </div>

            {/* PÁRRAFO LEGAL OFICIAL DE ATRIBUCIÓN Y DERECHOS */}
            <div className="max-w-xl mx-auto pt-2 px-2 text-center">
              <p className="font-diploma-body text-[10.5px] sm:text-[12px] text-slate-700 leading-relaxed font-normal text-justify sm:text-center">
                Quien ha cumplido con los requisitos legales y académicos correspondientes, en consecuencia se le reconocerán todos los derechos y atribuciones de este título de tercer nivel en la modalidad presencial.
              </p>
            </div>

            {/* ========================================================================= */}
            {/* BLOQUE INFERIOR: FECHA, FIRMAS OFICIALES Y PIE DE PÁGINA (mt-auto)       */}
            {/* ========================================================================= */}
            <div className="w-full flex flex-col items-center space-y-2 pt-6" style={{ marginTop: 'auto' }}>

              {/* LUGAR Y FECHA DE EMISIÓN / AÑO (EDITABLE EN LÍNEA) */}
              <div className="w-full flex justify-end pr-4 sm:pr-8">
                <div className="flex items-center font-diploma-cinzel text-[10.5px] sm:text-xs font-semibold text-slate-800">
                  <span>Dado y firmado en &nbsp;</span>
                  <input
                    type="text"
                    value={diplomaDate}
                    onChange={(e) => setDiplomaDate(e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-amber-400 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none text-right font-bold text-slate-800 transition-colors w-64 print:border-none print:bg-transparent"
                    placeholder="Tulcán, 15 de mayo de 2025"
                    title="Haz clic para modificar el lugar, fecha o año"
                  />
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECCIÓN DE FIRMAS (CONDICIONAL SEGÚN EL MODO SELECCIONADO)                */}
              {/* ========================================================================= */}
              
              {/* CASO 1: MODO FIRMAS DE CÓDIGO CRIPTOGRÁFICO WEB3 (HASHES ON-CHAIN) */}
              {signatureMode === 'code' && (
                <div className="w-full pt-4 mt-4 border-t border-slate-300">
                  <div className="text-center mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-emerald-900 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300 inline-flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Firmas Criptográficas de Código • Quórum DAO 3/3 Registrado On-Chain</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center items-center">
                    {/* Docente 1 - Presidente */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 shadow-2xs space-y-1">
                      <div className="flex items-center justify-center">
                        <span className="font-mono text-[9px] text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 font-bold truncate max-w-[210px]" title={tribunalAddr(0)}>
                          {shortAddr(tribunalAddr(0))}
                        </span>
                      </div>
                      <div className="w-24 h-px bg-slate-300 mx-auto my-1" />
                      <p className="text-[11px] font-bold text-slate-900">Presidente de Tribunal</p>
                      <p className="text-[9.5px] text-emerald-800 font-semibold">✓ Firma Digital ECDSA On-Chain</p>
                    </div>

                    {/* Sello DAO Central con Emblema */}
                    <div className="flex flex-col items-center justify-center py-1">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Código QR de verificación" className="w-20 h-20 border border-slate-300 rounded bg-white p-0.5" />
                      ) : (
                        <div className="w-20 h-20 rounded bg-slate-100 border border-slate-300" />
                      )}
                      <span className="text-[9.5px] font-black text-amber-900 mt-1">
                        {Number(project.status) === 1 ? 'APROBADO 3/3 EN LA CADENA' : 'SIN CERTIFICADO EMITIDO'}
                      </span>
                      <span className="text-[8.5px] text-slate-600 font-mono">Certificado #{project.certificateId || '—'}</span>
                    </div>

                    {/* Docente 2 - Director */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 shadow-2xs space-y-1">
                      <div className="flex items-center justify-center">
                        <span className="font-mono text-[9px] text-teal-900 bg-teal-100/90 px-2 py-0.5 rounded border border-teal-300 font-bold truncate max-w-[210px]" title={tribunalAddr(2)}>
                          {shortAddr(tribunalAddr(2))}
                        </span>
                      </div>
                      <div className="w-24 h-px bg-slate-300 mx-auto my-1" />
                      <p className="text-[11px] font-bold text-slate-900">Director de Titulación</p>
                      <p className="text-[9.5px] text-teal-800 font-semibold">✓ Firma Digital ECDSA On-Chain</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 2: MODO FIRMAS HUMANAS (OFICIAL UPEC O LÍNEAS PARA FIRMA FÍSICA) */}
              {(signatureMode === 'official' || signatureMode === 'blank') && (
                <div className="w-full grid grid-cols-2 gap-4 sm:gap-12 pt-4 sm:pt-6 items-end px-2 sm:px-6 mb-1">
                  
                  {/* RECTOR (IZQUIERDA) */}
                  <div className="flex flex-col items-center relative">
                    {/* Sello Circular Azul Húmedo de Rectorado (visible en modo oficial) */}
                    {signatureMode === 'official' && (
                      <div className="absolute -top-10 right-4 sm:right-10 pointer-events-none transform -rotate-6 opacity-85">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[#1d4ed8] flex items-center justify-center p-1">
                          <div className="w-full h-full rounded-full border border-[#1d4ed8] flex flex-col items-center justify-center text-[#1d4ed8] text-[7.5px] font-bold text-center leading-tight">
                            <span className="text-[6.5px] tracking-tight uppercase">UNIVERSIDAD POLITÉCNICA</span>
                            <span className="text-[6px] tracking-tight uppercase">ESTATAL DEL CARCHI</span>
                            <div className="w-10 h-px bg-[#1d4ed8] my-0.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">UPEC</span>
                            <span className="text-[7.5px] font-extrabold uppercase">RECTORADO</span>
                            <div className="w-8 h-px bg-[#1d4ed8] my-0.5" />
                            <span className="text-[6px] uppercase tracking-widest">TULCÁN</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Firma Cursiva o Espacio en Blanco para Firma Física */}
                    <div className="h-12 sm:h-14 flex items-center justify-center font-diploma-script text-3xl sm:text-4xl text-[#1e293b] select-none transform -rotate-3">
                      {signatureMode === 'official' ? 'Jorge I. Mina O.' : ''}
                    </div>
                    
                    {/* Línea de Firma */}
                    <div className="w-36 sm:w-48 h-px bg-slate-400 mb-1" />
                    
                    <span className="font-diploma-cinzel text-[10.5px] sm:text-xs font-bold text-slate-900 block text-center">
                      {rectorName}
                    </span>
                    <span className="font-diploma-cinzel text-[9.5px] sm:text-[10.5px] font-extrabold text-slate-700 block text-center uppercase tracking-wider">
                      {rectorTitle}
                    </span>
                  </div>

                  {/* SECRETARÍA GENERAL (DERECHA) */}
                  <div className="flex flex-col items-center relative">
                    {/* Sello Circular Azul Húmedo de Secretaría General (visible en modo oficial) */}
                    {signatureMode === 'official' && (
                      <div className="absolute -top-10 left-4 sm:left-10 pointer-events-none transform rotate-3 opacity-85">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[#1d4ed8] flex items-center justify-center p-1">
                          <div className="w-full h-full rounded-full border border-[#1d4ed8] flex flex-col items-center justify-center text-[#1d4ed8] text-[7px] font-bold text-center leading-tight">
                            <span className="text-[6.5px] tracking-tight uppercase">UNIVERSIDAD POLITÉCNICA</span>
                            <span className="text-[6px] tracking-tight uppercase">ESTATAL DEL CARCHI</span>
                            <div className="w-10 h-px bg-[#1d4ed8] my-0.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">UPEC</span>
                            <span className="text-[7px] font-extrabold uppercase">SECRETARÍA GENERAL</span>
                            <div className="w-8 h-px bg-[#1d4ed8] my-0.5" />
                            <span className="text-[6px] uppercase tracking-widest">TULCÁN</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Firma Cursiva o Espacio en Blanco para Firma Física */}
                    <div className="h-12 sm:h-14 flex items-center justify-center font-diploma-script text-3xl sm:text-4xl text-[#1e293b] select-none transform rotate-2">
                      {signatureMode === 'official' ? 'Maryury M. Pozo' : ''}
                    </div>
                    
                    {/* Línea de Firma */}
                    <div className="w-36 sm:w-48 h-px bg-slate-400 mb-1" />
                    
                    <span className="font-diploma-cinzel text-[10.5px] sm:text-xs font-bold text-slate-900 block text-center">
                      {secretaryName}
                    </span>
                    <span className="font-diploma-cinzel text-[9.5px] sm:text-[10.5px] font-extrabold text-slate-700 block text-center uppercase tracking-wider">
                      {secretaryTitle}
                    </span>
                  </div>
                </div>
              )}

              {/* Corredor espacial reservado para que la Banda Tricolor pase limpia */}
              <div className="w-full h-14 sm:h-16 pointer-events-none" />

              {/* BANDA DE VERIFICACIÓN CRIPTOGRÁFICA WEB3 Y AVISO INSTITUCIONAL (RF-32) */}
              <div className="w-full pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[8px] sm:text-[8.5px] font-mono text-slate-500 gap-2 pl-36 sm:pl-40 pr-4 print:border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Título Registrado en Blockchain EVM UPEC</span>
                  </span>
                  <span className="hidden sm:inline text-slate-400">•</span>
                  <span className="hidden sm:inline">Quórum Tribunal DAO: 3/3 Aprobado</span>
                </div>

                <div className="flex items-center gap-2">
                  {project.ipfsMetadataCID && (
                    <span className="text-slate-600 truncate max-w-[200px]" title={project.ipfsMetadataCID}>
                      CID: {project.ipfsMetadataCID.substring(0, 16)}...
                    </span>
                  )}
                  <span className="text-slate-400">Tulcán - Ecuador</span>
                </div>
              </div>

              <div className="w-full pt-0.5 text-center text-[7.5px] sm:text-[8px] font-sans font-medium text-slate-400 border-t border-slate-100 pl-36 sm:pl-40 pr-4 print:text-slate-500">
                Entorno Académico Experimental UPEC — Sin validez legal oficial (RF-32)
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
