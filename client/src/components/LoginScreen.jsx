import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  GraduationCap,
  Vote,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  School,
  KeyRound,
  Sliders,
  RotateCcw,
  RefreshCw,
  Building2,
  X,
  HelpCircle,
} from 'lucide-react';
import { UPEC_FACULTIES } from '../data/contractsData.js';
import {
  getDatabaseUsers,
  saveDatabaseUser,
  authenticateDatabaseUser,
  getAppSettings,
  saveAppSettings,
  isLocalMode,
} from '../utils/upecDatabase.js';
import { firebaseLogin, firebaseRegisterStudent, firebaseResetPassword } from '../utils/firebase.js';
import SettingsDrawer from './SettingsDrawer.jsx';
import TermsAndPrivacyModal from './TermsAndPrivacyModal.jsx';

export default function LoginScreen({ onLoginSuccess, isConnected, userAddress }) {
  // Pestañas de Autenticación (Aisladas del interior: Base de datos trasladada exclusivamente al Sidebar)
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'web3', 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(getAppSettings);

  // Modal y Flujo de Recuperación de Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: Nueva Contraseña, 3: Confirmado
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Estados del Formulario de Inicio de Sesión (Preconfigurado para la Administradora / Secretaría UPEC)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // Estados del Formulario de Registro
  const [regFullName, setRegFullName] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFacultyId, setRegFacultyId] = useState('fiaca');
  const [regCareer, setRegCareer] = useState('Carrera de Computación');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Manejar Actualización de Ajustes
  const handleUpdateSettings = (newSettings) => {
    const updated = saveAppSettings(newSettings);
    setSettings(updated);
  };

  // 1. Manejo del Inicio de Sesión de la Administradora / Secretaría o Usuarios Autorizados
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();
    if (!emailTrim || !passTrim) {
      setErrorMessage('Ingresa tu correo institucional y tu contraseña.');
      return;
    }

    let authUser = null;
    if (isLocalMode) {
      // Modo local de demostración (sin Firebase configurado)
      const u = authenticateDatabaseUser(emailTrim, passTrim);
      if (!u) {
        setErrorMessage('Correo o contraseña incorrectos. En modo local la contraseña de las cuentas de demostración es demo2026.');
        return;
      }
      authUser = { ...u, authMethod: 'local' };
    } else {
      try {
        setIsBusy(true);
        authUser = await firebaseLogin(emailTrim, passTrim);
      } catch (err) {
        const code = err?.code || '';
        setErrorMessage(
          code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
            ? 'Correo o contraseña incorrectos.'
            : err.message || 'No se pudo iniciar sesión.'
        );
        return;
      } finally {
        setIsBusy(false);
      }
    }

    try {
      sessionStorage.setItem('upec_auth_session', JSON.stringify(authUser));
      if (rememberMe) localStorage.setItem('upec_auth_session', JSON.stringify(authUser));
    } catch (err) {
      console.warn('Storage error:', err);
    }
    onLoginSuccess(authUser);
  };

  // 2. Manejo del Flujo de Recuperación de Contraseña
  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setForgotError('Ingresa un correo institucional válido (@upec.edu.ec).');
      return;
    }
    if (isLocalMode) {
      setForgotError('La recuperación de contraseña requiere Firebase. En modo local la contraseña de demostración es demo2026.');
      return;
    }
    try {
      await firebaseResetPassword(email);
      setForgotStep(3);
      setForgotSuccess(`Se envió un enlace para restablecer la contraseña a ${email}.`);
    } catch (err) {
      setForgotError(err.message || 'No se pudo enviar el correo de recuperación.');
    }
  };

  const handleConfirmPasswordReset = (e) => {
    e.preventDefault();
    setForgotStep(3);
  };

  // 3. Manejo de Registro de Usuario
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regFullName.trim()) {
      setErrorMessage('El nombre y apellidos son obligatorios.');
      return;
    }
    if (!regCedula.trim() || regCedula.trim().length < 8) {
      setErrorMessage('Ingresa una cédula de identidad válida (mínimo 8 dígitos).');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico institucional válido (@upec.edu.ec).');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Debes leer y aceptar los Términos de Servicio y la Política de Privacidad de la UPEC.');
      return;
    }

    const facultyObj = UPEC_FACULTIES.find((f) => f.id === regFacultyId) || UPEC_FACULTIES[0];
    // El registro abierto crea solo cuentas de estudiante; Secretaría asigna los roles docente y admin.
    const profile = {
      name: regFullName.trim(),
      cedula: regCedula.trim(),
      email: regEmail.trim().toLowerCase(),
      role: 'student',
      faculty: facultyObj.name,
      facultyId: facultyObj.id,
      facultyCode: facultyObj.code,
      career: regCareer,
      walletAddress: userAddress || '',
      termsAccepted: true,
    };

    let authUser;
    if (isLocalMode) {
      saveDatabaseUser({ ...profile, demoPassword: regPassword, createdAt: new Date().toISOString() });
      authUser = { ...profile, authMethod: 'local' };
    } else {
      try {
        setIsBusy(true);
        authUser = await firebaseRegisterStudent(profile.email, regPassword, profile);
      } catch (err) {
        setErrorMessage(err?.code === 'auth/email-already-in-use' ? 'Ese correo ya tiene una cuenta.' : err.message);
        return;
      } finally {
        setIsBusy(false);
      }
    }

    try {
      sessionStorage.setItem('upec_auth_session', JSON.stringify(authUser));
      if (rememberMe) localStorage.setItem('upec_auth_session', JSON.stringify(authUser));
    } catch (err) {
      console.warn('Storage error:', err);
    }
    onLoginSuccess(authUser);
  };

  // 4. Acceso con MetaMask Conectado
  const handleWeb3DirectLogin = () => {
    if (!isConnected || !userAddress) {
      setErrorMessage('Conecta primero tu billetera MetaMask con el botón superior.');
      return;
    }
    // La billetera solo identifica a un usuario que ya existe en la base institucional.
    const match = getDatabaseUsers().find(
      (u) => u.walletAddress && u.walletAddress.toLowerCase() === userAddress.toLowerCase()
    );
    if (!match || !isLocalMode) {
      setErrorMessage(
        isLocalMode
          ? 'Esta billetera no está vinculada a ninguna cuenta. Inicia sesión con tu correo.'
          : 'Con Firebase el acceso es con correo y contraseña; la billetera se vincula en tu perfil.'
      );
      return;
    }
    const authUser = { ...match, authMethod: 'metamask' };
    try {
      sessionStorage.setItem('upec_auth_session', JSON.stringify(authUser));
      if (rememberMe) localStorage.setItem('upec_auth_session', JSON.stringify(authUser));
    } catch (err) {
      console.warn('Storage error:', err);
    }
    onLoginSuccess(authUser);
  };

  return (
    <div className="relative min-h-screen text-slate-800 flex flex-col justify-between selection:bg-emerald-700 selection:text-white overflow-hidden">
      {/* Fondo Panorámico del Campus UPEC con Overlay Institucional Verde */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/upec-campus.jpg')` }}
      />
      {/* Capa de degradado verde esmeralda y pizarra institucional con transparencia equilibrada */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#003B1E]/94 via-[#002814]/90 to-[#0F172A]/96 backdrop-blur-[2px] z-0" />
      {/* Patrón de cuadrícula arquitectónica institucional */}
      <div className="fixed inset-0 opacity-15 bg-[radial-gradient(#FBBF24_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0" />

      {/* Marca de agua institucional del Búho UPEC en el fondo */}
      <div className="fixed -bottom-16 -right-16 w-96 h-96 opacity-10 pointer-events-none z-0 hidden lg:block">
        <img src="/upec-owl.png" alt="" className="w-full h-full object-contain filter invert" />
      </div>

      {/* Barra superior de bandera tricolor institucional UPEC (Verde, Amarillo, Blanco) */}
      <div className="relative z-10 h-2 w-full bg-gradient-to-r from-[#007A3D] via-[#FBBF24] to-[#007A3D]" />

      {/* Contenedor Principal Centrado */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden text-slate-900 flex flex-col my-auto transition-all">
          
          {/* 1. Header Oficial Institucional UPEC */}
          <div className="relative bg-gradient-to-b from-[#007A3D] to-[#005A2B] text-white p-6 sm:p-7 text-center overflow-hidden border-b-4 border-amber-400">
            {/* Efecto de fondo institucional */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FBBF24_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Botón de Configuración y Tema en Login */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/20 shadow-xs flex items-center gap-1.5 text-xs font-semibold z-20"
              title="Personalizar tema institucional"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
            </button>

            {/* Logo Oficial: Búho Institucional de la UPEC */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mb-3 p-1.5 rounded-2xl bg-white shadow-xl border-2 border-amber-400 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <img
                  src="/upec-owl.png"
                  alt="Insignia y Búho Oficial UPEC"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>

              <div className="inline-block px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-widest uppercase mb-1.5 shadow-sm">
                PROTOTIPO ACADÉMICO WEB3
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase leading-snug">
                UNIVERSIDAD POLITÉCNICA ESTATAL DEL CARCHI
              </h1>

              <p className="text-xs text-emerald-100 font-medium mt-1">
                Registro de trabajos, tribunal y certificados verificables
              </p>
            </div>
          </div>

          {/* 2. Pestañas de Navegación del Portal de Acceso (Aislamiento Total: BD ahora en Sidebar) */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-2 text-center transition border-b-2 flex items-center justify-center space-x-1.5 ${
                activeTab === 'login'
                  ? 'border-[#007A3D] text-[#007A3D] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Iniciar sesión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('web3');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-2 text-center transition border-b-2 flex items-center justify-center space-x-1.5 ${
                activeTab === 'web3'
                  ? 'border-[#007A3D] text-[#007A3D] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>MetaMask</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-2 text-center transition border-b-2 flex items-center justify-center space-x-1.5 ${
                activeTab === 'register'
                  ? 'border-[#007A3D] text-[#007A3D] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Registro</span>
            </button>
          </div>

          {/* Mensajes de Notificación / Error */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 3. Contenido de Formularios */}
          <div className="p-6">
            
            {/* ============================================================= */}
            {/* PESTAÑA A: ACCESO EXCLUSIVO DE ADMINISTRACIÓN (SECRETARÍA UPEC) */}
            {/* ============================================================= */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Insignia de Perfil de Secretaría */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                    <School className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950 block">Acceso con correo institucional</span>
                    <span className="text-[11px] text-emerald-800 font-medium">Graduandos, docentes del tribunal y Secretaría</span>
                  </div>
                </div>

                {/* Correo Institucional Personal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico Institucional:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="usuario@upec.edu.ec"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Contraseña Individual */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Contraseña Individual:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setForgotStep(1);
                        setForgotError('');
                        setForgotSuccess('');
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Recordar Sesión */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-[#007A3D] focus:ring-emerald-500 border-slate-300 w-4 h-4"
                    />
                    <span>Recordar credenciales</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">UPEC-SEC-2026</span>
                </div>

                {/* Botón de Ingreso Principal */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-2"
                >
                  <span>Ingresar al Sistema de Titulación</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </button>

                {/* Selector rápido de perfiles académicos de prueba */}
                <div className="pt-3 border-t border-slate-100 text-left space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>{isLocalMode ? 'Modo local: cuentas de demostración (contraseña demo2026)' : 'Acceso con cuenta institucional (Firebase)'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {(isLocalMode ? getDatabaseUsers() : []).map((u, idx) => {
                      const isSelected = loginEmail.toLowerCase() === u.email.toLowerCase();
                      const roleLabel = u.role === 'admin' 
                        ? 'Secretaría General' 
                        : u.role === 'docente' 
                        ? 'Docente (puede integrar tribunales)' 
                        : 'Estudiante Graduando';

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setLoginEmail(u.email);
                            setLoginPassword('demo2026');
                            setErrorMessage('');
                          }}
                          className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="block truncate font-semibold">{u.name}</span>
                            <span className="text-[9.5px] text-slate-500 font-medium">{roleLabel}</span>
                          </div>
                          <span className="text-xs shrink-0 pl-1">{u.avatar || (u.role === 'admin' ? '🏛️' : u.role === 'docente' ? '👨‍🏫' : '👨‍🎓')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* PESTAÑA B: SINCRONIZACIÓN METAMASK / WEB3                    */}
            {/* ============================================================= */}
            {activeTab === 'web3' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Conexión con Billetera MetaMask</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Permite a los miembros del Tribunal y Graduandos firmar actas criptográficas mediante ECDSA y custodiar su token de título en la red Ethereum (Chain ID 1337).
                  </p>
                </div>

                <div className="py-2 flex justify-center">
                  <ConnectButton showBalance={false} />
                </div>

                {isConnected && userAddress ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-xs break-all">
                      <span className="font-bold font-sans block text-[10px] text-emerald-700">
                        BILLETERA DETECTADA:
                      </span>
                      {userAddress}
                    </div>
                    <button
                      type="button"
                      onClick={handleWeb3DirectLogin}
                      className="w-full py-3 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-300" />
                      <span>Ingresar con esta Billetera Web3</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 pt-1">
                    Conecta tu billetera para verificar firmas digitales en blockchain.
                  </p>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* PESTAÑA C: REGISTRO DE NUEVA CUENTA INSTITUCIONAL             */}
            {/* ============================================================= */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre Completo y Apellidos:</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ej: Lic. Elena Alexandra Paspuel"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cédula:</label>
                    <input
                      type="text"
                      required
                      value={regCedula}
                      onChange={(e) => setRegCedula(e.target.value)}
                      placeholder="0400000000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-medium focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Rol:</label>
                    <div className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-600" title="Los roles docente y Secretaría los asigna la universidad">
                      Graduando
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Institucional UPEC:</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="usuario@upec.edu.ec"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Contraseña:</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Confirmar:</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-medium focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="rounded text-[#007A3D] focus:ring-emerald-500 border-slate-300 w-4 h-4"
                    />
                    <span>Acepto los términos y política de privacidad de la UPEC</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-2 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Crear Cuenta y Acceder</span>
                </button>
              </form>
            )}
          </div>

          {/* 4. Footer de la Tarjeta */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Reglas Académicas Simuladas</span>
            </span>
            <span className="font-mono text-[10px] text-slate-600">EVM Carchi • Tulcán</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA INSTITUCIONAL                         */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150">
            {/* Encabezado del Modal */}
            <div className="bg-[#007A3D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Recuperación de Contraseña Institucional</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* PASO 1: Ingreso de Correo Institucional */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ingresa el correo electrónico institucional (@upec.edu.ec) de tu cuenta de Secretaría o Administración para verificar tu identidad y generar tu enlace de restablecimiento seguro.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correo Institucional:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="usuario@upec.edu.ec"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center space-x-2"
                    >
                      <span>Validar y Continuar</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: Ingreso de Nueva Contraseña */}
              {forgotStep === 2 && (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Identidad institucional verificada</span>
                      <span className="text-[11px] text-blue-800">
                        Introduce tu nueva contraseña personal para {forgotEmail}.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nueva Contraseña:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmar Nueva Contraseña:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Guardar Nueva Contraseña</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                    >
                      Atrás
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 3: Confirmación Exitosa */}
              {forgotStep === 3 && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Contraseña Actualizada Correctamente
                  </h4>
                  <p className="text-xs text-slate-600">
                    Tu contraseña institucional ha sido guardada en la base de datos persistente. Ya puedes ingresar a la plataforma con tu nueva clave.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginPassword(newPassword);
                      setShowForgotModal(false);
                      setForgotStep(1);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs transition"
                  >
                    Volver e Iniciar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Configuración Institucional */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Modal Institucional de Términos de Servicio */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptTerms(true)}
      />

      {/* Footer Institucional Exterior */}
      <footer className="relative z-10 py-4 px-4 text-center space-y-1.5 text-xs text-emerald-100/80">
        <div className="font-medium">
          © {new Date().getFullYear()} Universidad Politécnica Estatal del Carchi (UPEC) • Prototipo Académico de Titulación Web3
        </div>
        <p className="text-[11px] text-emerald-200/60 max-w-2xl mx-auto leading-relaxed">
          Prototipo desarrollado con fines académicos y de investigación. Los certificados, tokens y transacciones generados no poseen validez legal oficial ni valor monetario real (RF-32).
        </p>
      </footer>
    </div>
  );
}
