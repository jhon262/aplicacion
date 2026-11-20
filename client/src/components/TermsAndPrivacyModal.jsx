import React from 'react';
import {
  ShieldCheck,
  Scale,
  FileText,
  Lock,
  CheckCircle2,
  X,
  ExternalLink,
  Building2,
  ScrollText,
} from 'lucide-react';

export default function TermsAndPrivacyModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Cabecera Institucional */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between border-b border-emerald-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-800/70 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px] font-semibold border border-amber-300/30 mb-0.5">
                <Building2 className="w-3 h-3" />
                <span>UPEC • FIACA — Secretaría General</span>
              </div>
              <h3 id="terms-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Términos de Servicio y Política de Privacidad
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Documento Legal y Académico */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-[13px] text-slate-600 leading-relaxed font-sans">
          {/* Alerta de Marco Legal */}
          <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 text-xs">
                Cumplimiento de la Ley Orgánica de Protección de Datos Personales (LOPDP - Ecuador)
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                El presente instrumento rige el acceso y uso del prototipo académico de titulación descentralizada y custodia de contratos Web3 de la Universidad Politécnica Estatal del Carchi.
              </p>
            </div>
          </div>

          {/* Cláusula 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">1</span>
              <span>Identificación Institucional y Objeto del Prototipo</span>
            </h4>
            <p>
              La plataforma ha sido desarrollada en el marco del proyecto de titulación de la carrera de <strong>Ingeniería en Computación</strong> de la <strong>Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)</strong>. Su objeto exclusivo es la investigación aplicada sobre arquitecturas descentralizadas, almacenamiento distribuido en IPFS y automatización de acuerdos mediante Smart Contracts en la UPEC.
            </p>
          </div>

          {/* Cláusula 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">2</span>
              <span>Tratamiento y Protección de Datos Personales</span>
            </h4>
            <p>
              Los datos identificativos requeridos para el registro (nombres completos, cédula de ciudadanía o identidad, facultad, carrera y correo institucional <code>@upec.edu.ec</code>) serán procesados exclusivamente con fines de autenticación, generación de actas de grado y asignación de roles académicos (Graduando, Tribunal Evaluador DAO, Secretaría Académica). En ningún caso serán transferidos ni comercializados a terceras partes.
            </p>
          </div>

          {/* Cláusula 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">3</span>
              <span>Inmutabilidad y Publicidad Criptográfica en Blockchain</span>
            </h4>
            <p>
              El usuario reconoce expresamente que los registros on-chain emitidos en los contratos inteligentes (emisión de Certificados NFT <code>ERC-721</code>, resoluciones de grado colegiadas y acuerdos de depósito en garantía <code>PurchaseEscrow.sol</code>) poseen naturaleza <strong>inmutable y permanente</strong> en el libro mayor distribuido. Los hashes criptográficos (CID IPFS) son públicos para posibilitar la verificación de autenticidad de títulos sin intermediarios.
            </p>
          </div>

          {/* Cláusula 4 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">4</span>
              <span>Moneda Académica de Demostración (UPECToken - ERC-20)</span>
            </h4>
            <p>
              Los tokens de investigación <strong>UPECT</strong> dispensados a través del Faucet institucional se utilizan con propósitos de simulación de compraventa de licencias académicas, pago de tasas ficticias de titulación y pruebas de laboratorio Web3. No constituyen moneda de curso legal, activos financieros regulados ni valores especulativos.
            </p>
          </div>

          {/* Cláusula 5 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">5</span>
              <span>Custodia de Billeteras y Responsabilidad del Usuario</span>
            </h4>
            <p>
              El usuario es el único responsable de la custodia de sus llaves privadas y frases de recuperación asociadas a su billetera Web3 (MetaMask u otras). La infraestructura institucional de la UPEC nunca solicitará ni almacenará la clave privada del usuario.
            </p>
          </div>

          {/* Cláusula 6 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700">6</span>
              <span>Consentimiento Libre, Expreso e Informado</span>
            </h4>
            <p>
              Al marcar la casilla obligatoria de verificación en el formulario de registro, el usuario declara haber leído, comprendido y aceptado en su totalidad las cláusulas anteriores, consintiendo el almacenamiento seguro de sus credenciales académicas conforme a las directrices de la UPEC.
            </p>
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-mono">
            Versión 2.1 • Vigencia 2026 • Tulcán, Ecuador
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                if (onAccept) onAccept();
                onClose();
              }}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aceptar Términos y Privacidad</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
