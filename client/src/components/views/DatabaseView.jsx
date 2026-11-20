import React, { useState } from 'react';
import {
  Database,
  Search,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  FolderKanban,
  ShieldCheck,
  Eye,
  Plus,
  X,
  GraduationCap,
  Vote,
  School,
  UserCheck,
  Building2,
  Lock,
  Mail,
  Hash,
  BookOpen,
} from 'lucide-react';
import { UPEC_FACULTIES } from '../../data/contractsData.js';
import {
  getDatabaseProjects,
  saveDatabaseProject,
  deleteDatabaseProject,
  getDatabaseUsers,
  saveDatabaseUser,
  deleteDatabaseUser,
  resetDatabaseToDefaults,
} from '../../utils/upecDatabase.js';

export default function DatabaseView({
  currentUser,
  currentTheme,
  onSelectTab,
  onOpenDocumentViewer,
  setNotification,
  chainProjects = [],
}) {
  const [activeSubTab, setActiveSubTab] = useState('projects'); // 'projects', 'users', 'new-user'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [dbRecords, setDbRecords] = useState(getDatabaseProjects);
  // Filas: estado y votos desde la cadena + datos personales desde Firestore (enlazados por hash del PDF)
  const dbProjects = [
    ...chainProjects.map((p) => ({ ...p })),
    ...dbRecords
      .filter((r) => !chainProjects.some((p) => p.documentHash?.toLowerCase() === String(r.documentHash).toLowerCase()))
      .map((r) => ({ ...r, id: r.projectId ?? '—', status: -1 })),
  ];
  const [dbUsers, setDbUsers] = useState(getDatabaseUsers);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Estados para Registro de Nuevo Usuario Directo en BD
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserCedula, setNewUserCedula] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserWallet, setNewUserWallet] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');
  const [newUserFacultyId, setNewUserFacultyId] = useState('fiaca');
  const [newUserCareer, setNewUserCareer] = useState('Carrera de Computación');
  const [newUserPassword, setNewUserPassword] = useState('upec2026');
  const [newUserBio, setNewUserBio] = useState('');

  const WALLET_PRESETS = [
    { label: 'Secretaría (Admin #0)', address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', role: 'admin' },
    { label: 'Estudiante (Postulante #1)', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', role: 'student' },
    { label: 'Docente #1 (Presidente)', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', role: 'docente' },
    { label: 'Docente #2 (Vocal 1)', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', role: 'docente' },
    { label: 'Docente #3 (Vocal 2)', address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', role: 'docente' },
  ];

  const refreshAllData = () => {
    setDbRecords(getDatabaseProjects());
    setDbUsers(getDatabaseUsers());
  };

  const showBanner = (type, text) => {
    setFeedbackMessage({ type, text });
    if (setNotification) {
      setNotification({ type, message: text });
    }
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Restablecer Base de Datos completa
  const handleResetDatabase = () => {
    if (
      window.confirm(
        '¿Confirmas restablecer toda la base de datos a los valores oficiales iniciales de la UPEC?\n\nEsta acción restaurará los proyectos y usuarios predeterminados.'
      )
    ) {
      resetDatabaseToDefaults();
      refreshAllData();
      showBanner('success', 'Base de datos restablecida con éxito a los valores oficiales de la UPEC.');
    }
  };

  // Eliminar un proyecto
  const handleDeleteProject = (projectId, projectTitle) => {
    if (window.confirm(`¿Borrar los datos personales asociados a "${projectTitle}"?\n\nEl hash, los votos y el certificado quedan en la cadena; solo se eliminan nombre, cédula y calificación de Firestore (LOPDP).`)) {
      deleteDatabaseProject(projectId);
      refreshAllData();
      showBanner('info', `Proyecto #${projectId} eliminado de la base de datos.`);
    }
  };

  // Eliminar un usuario
  const handleDeleteUser = (email, userName) => {
    if (dbUsers.length <= 1) {
      alert('No es posible eliminar el único usuario restante de la base de datos.');
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar la cuenta de "${userName}" (${email})?`)) {
      deleteDatabaseUser(email);
      refreshAllData();
      showBanner('info', `Usuario "${userName}" eliminado de la base de datos.`);
    }
  };

  // Guardar nuevo usuario
  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUserFullName.trim()) {
      showBanner('error', 'El nombre y apellidos son obligatorios.');
      return;
    }
    if (!newUserCedula.trim() || newUserCedula.trim().length < 8) {
      showBanner('error', 'Ingresa una cédula de identidad válida (mínimo 8 dígitos).');
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      showBanner('error', 'Ingresa un correo institucional válido (@upec.edu.ec).');
      return;
    }

    const facultyObj = UPEC_FACULTIES.find((f) => f.id === newUserFacultyId) || UPEC_FACULTIES[0];
    const created = saveDatabaseUser({
      name: newUserFullName.trim(),
      cedula: newUserCedula.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      faculty: facultyObj.name,
      facultyId: facultyObj.id,
      facultyCode: facultyObj.code,
      career: newUserCareer,
      walletAddress: newUserWallet.trim(),
      password: newUserPassword || 'upec2026',
      bio: newUserBio.trim() || 'Usuario registrado en la base de datos institucional UPEC.',
      avatar: newUserRole === 'docente' ? '👨‍🏫' : newUserRole === 'admin' ? '🏛️' : '👨‍🎓',
      createdAt: new Date().toISOString(),
    });

    refreshAllData();
    showBanner('success', `Usuario "${created.name}" registrado correctamente en la base de datos.`);

    // Limpiar formulario y volver a la pestaña de usuarios
    setNewUserFullName('');
    setNewUserCedula('');
    setNewUserEmail('');
    setNewUserWallet('');
    setNewUserBio('');
    setActiveSubTab('users');
  };

  // Proyectos filtrados
  const filteredProjects = dbProjects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.studentName || '').toLowerCase().includes(q) ||
      String(p.studentId || '').toLowerCase().includes(q) ||
      String(p.id || '').includes(q);

    const matchesFaculty = filterFaculty === 'all' || p.facultyId === filterFaculty;
    return matchesSearch && matchesFaculty;
  });

  // Usuarios filtrados
  const filteredUsers = dbUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      String(u.name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.cedula || '').toLowerCase().includes(q) ||
      String(u.role || '').toLowerCase().includes(q)
    );
  });

  const primaryColor = currentTheme?.primary || '#007A3D';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Cabecera Principal del Módulo de Base de Datos */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-xs border border-emerald-700/60"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #004D26 65%, #052e16 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-amber-300 text-xs font-semibold shadow-xs">
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Base de Datos Persistente • UPEC Web3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gestión Integral de la Base de Datos
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
              Repositorio centralizado y persistente de proyectos de titulación, actas de grado, quórum DAO y cuentas de usuario registradas en el sistema.
            </p>
          </div>

          {/* Acciones Rápidas de Cabecera */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDatabase}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs"
              title="Restablecer base de datos a los valores oficiales"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Restablecer BD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('new-user')}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de Notificación / Alerta */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedbackMessage.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          ) : feedbackMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          ) : (
            <Database className="w-4 h-4 shrink-0 text-blue-700" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* 2. Tarjetas de Resumen Numérico (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Proyectos */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Tesis Registradas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{dbProjects.length}</span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              Expedientes
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Almacenados en persistencia local</p>
        </div>

        {/* KPI 2: Tesis Aprobadas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Certificados Aprobados</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200/60">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {dbProjects.filter((p) => p.status === 1).length}
            </span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              Quórum 3/3
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Con actas de grado y diplomas NFT</p>
        </div>

        {/* KPI 3: Cuentas Registradas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Cuentas Institucionales</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-200/60">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{dbUsers.length}</span>
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Perfiles
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Secretaría, docentes y graduandos</p>
        </div>

        {/* KPI 4: Estado y Almacenamiento */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Persistencia</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center border border-purple-200/60">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-extrabold text-slate-900 font-mono">100% Sincronizado</span>
          </div>
          <p className="text-[11px] text-slate-500">JSON + LocalStorage + Hash IPFS</p>
        </div>
      </div>

      {/* 3. Barra de Control de Pestañas y Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Pestañas de Navegación Interna de la Base de Datos */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('projects')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeSubTab === 'projects'
                  ? 'bg-white text-emerald-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-emerald-700" />
              <span>Proyectos de Grado ({dbProjects.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeSubTab === 'users'
                  ? 'bg-white text-emerald-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-700" />
              <span>Cuentas de Usuario ({dbUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('new-user')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeSubTab === 'new-user'
                  ? 'bg-white text-emerald-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Registrar Cuenta</span>
            </button>
          </div>

          {/* Campo de Búsqueda Rápida */}
          {activeSubTab !== 'new-user' && (
            <div className="flex items-center space-x-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeSubTab === 'projects' ? 'Buscar tesis, autor o cédula...' : 'Buscar usuario, email o rol...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeSubTab === 'projects' && (
                <select
                  value={filterFaculty}
                  onChange={(e) => setFilterFaculty(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">Todas las facultades</option>
                  {UPEC_FACULTIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBPESTAÑA 1: TABLA COMPLETA DE PROYECTOS DE TESIS            */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'projects' && (
          <div className="space-y-3">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <Database className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">No se encontraron proyectos en la base de datos.</p>
                <p className="text-[11px] text-slate-500">Prueba ajustando el término de búsqueda o registra una nueva tesis.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-14 text-center">ID</th>
                      <th className="py-3 px-4">Título del Trabajo Curricular</th>
                      <th className="py-3 px-4">Graduando / Cédula</th>
                      <th className="py-3 px-3">Facultad & Carrera</th>
                      <th className="py-3 px-3 text-center">Nota</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.documentHash || proj.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            #{proj.id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 leading-snug line-clamp-2 max-w-md" title={proj.title}>
                            {proj.title}
                          </div>
                          {proj.ipfsMetadataCID && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-xs" title={proj.ipfsMetadataCID}>
                              CID: {proj.ipfsMetadataCID.substring(0, 18)}...
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{proj.studentName || 'Sin datos personales'}</div>
                          <div className="text-[11px] font-mono text-slate-500">CI: {proj.studentId || '—'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {proj.career || 'Carrera de Computación'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">
                            {proj.facultyCode || 'FIACA'} • {proj.titleName || 'Ingeniero en Ciencias de la Computación'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                            {proj.score ? `${proj.score}/10` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {proj.status === 1 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aprobado</span>
                            </span>
                          ) : proj.status === 2 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
                              <span>Rechazado</span>
                            </span>
                          ) : proj.status === -1 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                              <span>No está en la red conectada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                              <Vote className="w-3 h-3 text-amber-600" />
                              <span>{proj.tribunalAssigned ? `En votación (${proj.votesFor}/3)` : 'Sin tribunal'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Ver Diploma NFT */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectTab) {
                                  onSelectTab('certificate');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition"
                              title="Ver Certificado NFT oficial"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>

                            {/* Leer Tesis en PDF */}
                            {onOpenDocumentViewer && (
                              <button
                                type="button"
                                onClick={() => onOpenDocumentViewer(proj, 'pdf')}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                                title="Ver documento PDF de tesis"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Eliminar de la base de datos */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(proj.documentHash || proj.id, proj.title)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition"
                              title="Borrar datos personales (el registro en la cadena no se puede borrar)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBPESTAÑA 2: TABLA DE CUENTAS DE USUARIO                     */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'users' && (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">No se encontraron usuarios en la base de datos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Usuario / Nombre</th>
                      <th className="py-3 px-4">Cédula & Clave</th>
                      <th className="py-3 px-4">Correo Institucional</th>
                      <th className="py-3 px-3 text-center">Rol</th>
                      <th className="py-3 px-4">Billetera Web3 (MetaMask)</th>
                      <th className="py-3 px-4">Facultad & Carrera</th>
                      <th className="py-3 px-3 text-center">Fecha Alta</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredUsers.map((u, idx) => {
                      const walletLower = String(u.walletAddress || '').toLowerCase();
                      const walletBadge =
                        walletLower === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
                          ? 'Secretaría (#0)'
                          : walletLower === '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
                          ? 'Estudiante (#1)'
                          : walletLower === '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
                          ? 'Docente 1 (#2)'
                          : walletLower === '0x90f79bf6eb2c4f870365e785982e1f101e93b906'
                          ? 'Docente 2 (#3)'
                          : walletLower === '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'
                          ? 'Docente 3 (#4)'
                          : u.walletAddress
                          ? 'Personalizada'
                          : null;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{u.avatar || '👨‍🎓'}</span>
                              <div>
                                <div className="font-bold text-slate-900">{u.name}</div>
                                <div className="text-[10px] text-slate-500">{u.career}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-semibold text-slate-800 text-xs">{u.cedula}</div>
                            <div className="text-[10px] font-mono text-slate-500">Clave: {u.password || 'upec2026'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300">
                                <School className="w-3 h-3 text-blue-600" />
                                <span>Secretaría</span>
                              </span>
                            ) : u.role === 'docente' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                                <Vote className="w-3 h-3 text-amber-600" />
                                <span>Tribunal DAO</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <GraduationCap className="w-3 h-3 text-emerald-600" />
                                <span>Graduando</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                            {u.walletAddress ? (
                              <div className="space-y-0.5">
                                <div className="text-slate-900 font-semibold truncate max-w-[140px]" title={u.walletAddress}>
                                  {u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}
                                </div>
                                {walletBadge && (
                                  <span className="inline-block text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-emerald-800 border border-slate-300 font-sans font-bold">
                                    {walletBadge}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin asignar</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] font-medium text-slate-800 truncate max-w-xs">{u.faculty}</div>
                          </td>
                          <td className="py-3 px-3 text-center text-[10px] text-slate-500 whitespace-nowrap">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Oficial'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {dbUsers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.email, u.name)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBPESTAÑA 3: FORMULARIO PARA REGISTRAR NUEVO USUARIO EN BD   */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'new-user' && (
          <form onSubmit={handleCreateUser} className="space-y-4 max-w-2xl bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Registrar Nueva Cuenta en la Base de Datos Institucional</span>
              </h3>
              <p className="text-xs text-slate-500">
                La cuenta se guardará inmediatamente en la base de datos local persistente para iniciar sesión en cualquier momento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Nombre Completo */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nombre Completo y Apellidos:</label>
                <input
                  type="text"
                  required
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  placeholder="Ej: MSc. Nombre Apellido"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Cédula */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Cédula de Identidad:</label>
                <input
                  type="text"
                  required
                  value={newUserCedula}
                  onChange={(e) => setNewUserCedula(e.target.value)}
                  placeholder="Ej: 0401876543"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Correo */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Correo Institucional UPEC:</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="docente2.demo@upec.edu.ec"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Contraseña Temporal:</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="upec2026"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Rol */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Rol en la Plataforma:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="student">Graduando / Estudiante (Autor de Tesis)</option>
                  <option value="docente">Docente Evaluador (Tribunal DAO)</option>
                  <option value="admin">Secretaría General / Administradora UPEC</option>
                </select>
              </div>

              {/* Facultad */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Facultad Académica:</label>
                <select
                  value={newUserFacultyId}
                  onChange={(e) => setNewUserFacultyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  {UPEC_FACULTIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Carrera o Cargo */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Carrera Universitaria o Cargo Oficial:</label>
              <input
                type="text"
                value={newUserCareer}
                onChange={(e) => setNewUserCareer(e.target.value)}
                placeholder="Ej: Carrera de Computación / Docente de Titulación"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Billetera Web3 / MetaMask */}
            <div className="space-y-1.5 text-xs bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Dirección de Billetera Web3 (MetaMask / Ethereum):</span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Para firmas y Smart Contracts</span>
              </div>
              <input
                type="text"
                value={newUserWallet}
                onChange={(e) => setNewUserWallet(e.target.value)}
                placeholder="Ej: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-mono text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <div className="pt-1">
                <span className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Asignación rápida de billeteras de prueba (Hardhat / MetaMask):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WALLET_PRESETS.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setNewUserWallet(p.address);
                        if (p.role) setNewUserRole(p.role);
                      }}
                      className="text-[10.5px] px-2 py-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-800 hover:text-emerald-950 font-medium transition border border-slate-300 flex items-center space-x-1"
                    >
                      <span className="font-bold">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Guardar Usuario en Base de Datos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('users')}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
