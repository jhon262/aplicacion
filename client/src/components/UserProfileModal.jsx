import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Hash,
  GraduationCap,
  Building2,
  Award,
  Phone,
  FileText,
  Save,
  Trash2,
  LogOut,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { UPEC_FACULTIES } from '../data/contractsData.js';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  onLogout,
  onDeleteAccount,
  userAddress,
  userProjectsCount = 0,
  userNftsCount = 0,
  theme,
}) {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name || '');
  const [cedula, setCedula] = useState(currentUser.cedula || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [role, setRole] = useState(currentUser.role || 'student');
  const [faculty, setFaculty] = useState(
    currentUser.faculty || 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)'
  );
  const [career, setCareer] = useState(currentUser.career || 'Ingeniería en Computación');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [bio, setBio] = useState(
    currentUser.bio || 'Estudiante e investigador del sistema de titulación descentralizada UPEC.'
  );
  const [avatar, setAvatar] = useState(currentUser.avatar || '👨‍🎓');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const selectedFacultyObj = UPEC_FACULTIES.find(
    (f) => f.name === faculty || f.id === currentUser.facultyId
  ) || UPEC_FACULTIES[0];

  const handleFacultyChange = (e) => {
    const facId = e.target.value;
    const facObj = UPEC_FACULTIES.find((f) => f.id === facId);
    if (facObj) {
      setFaculty(facObj.name);
      if (facObj.careers && facObj.careers.length > 0) {
        setCareer(facObj.careers[0]);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      cedula: cedula.trim(),
      email: email.trim(),
      role,
      faculty,
      career,
      phone: phone.trim(),
      bio: bio.trim(),
      avatar,
      walletAddress: userAddress || currentUser.walletAddress || null,
    };

    onSaveProfile(updatedUser);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCopyWallet = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header con Banner Institucional */}
        <div className={`p-6 text-white bg-gradient-to-r ${theme?.headerGradient || 'from-emerald-900 via-emerald-800 to-emerald-950'} relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-lg">
                {avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 flex gap-1 bg-white rounded-lg p-0.5 shadow-xs">
                {['👨‍🎓', '👨‍🏫', '🏛️', '👩‍💻'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className="text-xs hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{name || 'Usuario UPEC'}</h2>
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 capitalize">
                  {role === 'student' ? 'Estudiante Titulado' : role === 'docente' ? 'Docente Tribunal' : 'Secretaría Académica'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">{email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 opacity-80" />
                  CI: {cedula}
                </span>
                <span className="opacity-40">•</span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 opacity-80" />
                  {career}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Métricas */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-bold text-slate-800">{userProjectsCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Proyectos Registrados</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-bold text-emerald-600">{userNftsCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Diplomas NFT Emitidos</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-xs font-bold text-slate-700 truncate">
              {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'No vinculada'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3" />
              MetaMask Web3
            </div>
          </div>
        </div>

        {/* Formulario de Edición */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ¡Perfil actualizado y guardado en la base de datos exitosamente!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo y Apellidos
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cédula de Identidad
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico Institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rol Institucional
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="student">Estudiante / Graduando</option>
                <option value="docente">Docente / Tribunal DAO</option>
                <option value="admin">Secretaría Académica / Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Facultad Académica UPEC
              </label>
              <select
                value={selectedFacultyObj?.id || 'fiaca'}
                onChange={handleFacultyChange}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {UPEC_FACULTIES.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Carrera / Programa
              </label>
              <select
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {selectedFacultyObj?.careers?.map((car, idx) => (
                  <option key={idx} value={car}>
                    {car}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0990000001"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Billetera Web3 Conectada
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={userAddress || 'Sin billetera Web3 conectada'}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-mono"
                />
                {userAddress && (
                  <button
                    type="button"
                    onClick={handleCopyWallet}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600"
                    title="Copiar dirección"
                  >
                    {copiedWallet ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Biografía / Resumen de Investigación
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descripción breve de tus proyectos o línea de investigación..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Footer de Acciones del Perfil */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
              {onDeleteAccount && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que deseas eliminar esta cuenta de la base de datos local?')) {
                      onDeleteAccount(currentUser.email);
                    }
                  }}
                  className="px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Cuenta
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Perfil
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
