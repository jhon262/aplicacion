import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { isAddress } from 'viem';
import { getDatabaseUsers } from '../utils/upecDatabase.js';

/**
 * Panel de Secretaría para asignar los tres docentes del tribunal de un proyecto.
 * La lista sale de la base institucional (usuarios con rol docente y billetera).
 * El contrato verifica además que cada dirección tenga DOCENTE_ROLE, que no se repita
 * y que no sea el autor.
 */
export default function AssignTribunalPanel({ project, onAssign, disabled }) {
  const docentes = useMemo(
    () => getDatabaseUsers().filter((u) => u.role === 'docente' && u.walletAddress),
    []
  );
  const [members, setMembers] = useState(['', '', '']);
  const [error, setError] = useState('');

  const setMember = (i, value) => {
    const next = [...members];
    next[i] = value;
    setMembers(next);
    setError('');
  };

  const submit = async () => {
    const clean = members.map((m) => m.trim());
    if (clean.some((m) => !isAddress(m))) {
      setError('Selecciona o escribe tres direcciones válidas.');
      return;
    }
    if (new Set(clean.map((m) => m.toLowerCase())).size !== 3) {
      setError('Los tres integrantes deben ser distintos.');
      return;
    }
    if (project?.submitter && clean.some((m) => m.toLowerCase() === project.submitter.toLowerCase())) {
      setError('El autor no puede integrar su propio tribunal.');
      return;
    }
    await onAssign(project.id, clean);
  };

  return (
    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-sky-950">
        <Users className="w-4 h-4" />
        <span>Asignar tribunal (Secretaría)</span>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          {docentes.length > 0 ? (
            <select
              value={members[i]}
              onChange={(e) => setMember(i, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
            >
              <option value="">Docente {i + 1}…</option>
              {docentes.map((d) => (
                <option key={d.walletAddress} value={d.walletAddress}>
                  {d.name} ({d.walletAddress.slice(0, 6)}…{d.walletAddress.slice(-4)})
                </option>
              ))}
            </select>
          ) : (
            <input
              value={members[i]}
              onChange={(e) => setMember(i, e.target.value)}
              placeholder={`Billetera del docente ${i + 1} (0x…)`}
              className="w-full px-2 py-1.5 rounded-lg border border-sky-200 bg-white font-mono"
            />
          )}
        </div>
      ))}
      {error && <p className="text-rose-700 font-semibold">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="w-full py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold disabled:opacity-50"
      >
        Asignar tribunal e iniciar votación
      </button>
    </div>
  );
}
