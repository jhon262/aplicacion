import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  QrCode,
  FileCheck2,
  XCircle,
  Clock,
} from 'lucide-react';
import { computeFileSha256, gatewayUrlFor } from '../../utils/ipfs';

const STATUS_LABEL = { 0: 'Pendiente de votación', 1: 'Aprobado por el tribunal', 2: 'Rechazado' };

/**
 * Verificación pública.
 * Tres caminos: número de proyecto/certificado, PDF (se calcula su SHA-256 y se consulta
 * verifyDocument en el contrato) y código QR del certificado (?verify=<id>).
 * La respuesta sale siempre de la cadena; los datos personales se muestran solo si existen en Firestore.
 */
export default function VerificationView({
  projects = [],
  verifyDocument,
  onSelectTab,
  onOpenDocumentViewer,
  primaryColor = '#007A3D',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState(null); // { project, source, hashMatch }
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const scannerRef = useRef(null);

  const findById = (term) =>
    projects.find((p) => String(p.id) === term || (Number(p.certificateId) > 0 && String(p.certificateId) === term));

  const showById = (term, source) => {
    const found = findById(String(term).replace('#', '').trim());
    setResult(found ? { project: found, source } : null);
    setSearched(true);
  };

  // Enlace del QR: https://.../?verify=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('verify');
    if (id && projects.length) {
      setSearchTerm(id);
      showById(id, 'qr');
    }
  }, [projects.length]);

  useEffect(() => () => stopScanner(), []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    showById(searchTerm, 'id');
  };

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const hash = await computeFileSha256(file);
      let registered = false;
      let projectId = null;
      if (verifyDocument) {
        const r = await verifyDocument(hash);
        registered = Boolean(r?.registered ?? r?.[0]);
        projectId = r?.projectId ?? r?.[1];
      } else {
        const p = projects.find((x) => x.documentHash?.toLowerCase() === hash.toLowerCase());
        registered = Boolean(p);
        projectId = p?.id;
      }
      if (!registered) {
        setResult(null);
        setMessage(`El hash SHA-256 de este PDF (${hash.slice(0, 18)}…) no está registrado. El archivo no corresponde a ningún trabajo del sistema o fue modificado.`);
      } else {
        const p = findById(String(projectId));
        setResult(p ? { project: p, source: 'pdf', hashMatch: true } : null);
      }
      setSearched(true);
    } catch (err) {
      setMessage(err.message || 'No se pudo verificar el PDF.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        // ignore
      }
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setMessage('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setScanning(true);
      // esperar a que exista el contenedor
      await new Promise((r) => setTimeout(r, 50));
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (text) => {
          let id = text;
          try {
            id = new URL(text).searchParams.get('verify') || text;
          } catch {
            // el QR puede traer solo el número
          }
          setSearchTerm(id);
          showById(id, 'qr');
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setMessage('No se pudo abrir la cámara. Revisa el permiso de cámara del navegador o de la app.');
      console.error(err);
    }
  };

  const p = result?.project;
  const status = p ? Number(p.status) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl border-2 border-amber-400/80"
        style={{ background: `linear-gradient(135deg, ${primaryColor}dd 0%, #004D26 60%, #081a11 100%)` }}
      >
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verificación pública</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Verificar un certificado o un PDF</h2>
          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
            Busca por número de proyecto o de certificado, sube el PDF del trabajo para comparar su hash SHA-256 con el
            registrado en el contrato, o escanea el código QR impreso en el certificado.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Número de proyecto o de certificado (ej. 1)"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
          <button type="submit" className="px-6 py-3 rounded-2xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Consultar</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-sm cursor-pointer ${busy ? 'opacity-60' : ''}`}>
            <FileCheck2 className="w-4 h-4" />
            <span>{busy ? 'Calculando hash…' : 'Verificar con el PDF'}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handlePdf} disabled={busy} />
          </label>
          <button
            type="button"
            onClick={scanning ? stopScanner : startScanner}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>{scanning ? 'Detener cámara' : 'Escanear código QR'}</span>
          </button>
        </div>
        {scanning && <div id="qr-reader" className="mx-auto w-full max-w-xs rounded-2xl overflow-hidden border border-slate-200" />}
        {message && <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{message}</p>}
      </div>

      {searched && p ? (
        <div className={`bg-white border-2 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 ${status === 1 ? 'border-emerald-500/40' : status === 2 ? 'border-rose-400/50' : 'border-amber-400/50'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                {status === 1 ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : status === 2 ? <XCircle className="w-6 h-6 text-rose-600" /> : <Clock className="w-6 h-6 text-amber-600" />}
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">
                  {STATUS_LABEL[status]} · proyecto #{p.id}
                </span>
                <h3 className="text-lg font-black text-slate-900">{p.title}</h3>
              </div>
            </div>
            {status === 1 && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs">
                Certificado #{p.certificateId}
              </span>
            )}
          </div>

          {result.hashMatch && (
            <p className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              El hash SHA-256 del PDF coincide con el registrado en el contrato: el archivo no fue alterado.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Graduando</span>
              <span className="font-bold text-slate-900 text-sm block">{p.studentName || 'Datos personales no disponibles'}</span>
              {p.career && <span className="text-slate-500 block">{p.career}</span>}
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Tribunal</span>
              <span className="font-bold text-slate-900 text-sm block">
                {p.tribunalAssigned ? `${p.votesFor} de 3 votos a favor${p.votesAgainst ? `, ${p.votesAgainst} en contra` : ''}` : 'Sin tribunal asignado'}
              </span>
              <span className="text-slate-500 block">La aprobación exige el voto a favor de los tres docentes.</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 break-all">
            <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1">Huella registrada en la cadena</div>
            <div><span className="text-slate-400">SHA-256: </span><span className="text-amber-300">{p.documentHash}</span></div>
            <div>
              <span className="text-slate-400">IPFS: </span>
              {gatewayUrlFor(p.ipfsMetadataCID) ? (
                <a className="text-emerald-300 underline" href={gatewayUrlFor(p.ipfsMetadataCID)} target="_blank" rel="noopener noreferrer">{p.ipfsMetadataCID}</a>
              ) : (
                <span className="text-amber-200">modo demostración (archivo no publicado en IPFS)</span>
              )}
            </div>
            <div><span className="text-slate-400">Autor (billetera): </span>{p.submitter}</div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {onOpenDocumentViewer && (
              <button type="button" onClick={() => onOpenDocumentViewer(p, 'pdf')} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Ver PDF</span>
              </button>
            )}
            {status === 1 && onSelectTab && (
              <button type="button" onClick={() => onSelectTab('certificate')} className="px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300" />
                <span>Ver certificado</span>
              </button>
            )}
          </div>
        </div>
      ) : searched && !message ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No hay ningún proyecto con ese número</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Revisa el número o verifica con el PDF original.</p>
        </div>
      ) : null}
    </div>
  );
}
