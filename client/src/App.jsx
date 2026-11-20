import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ShieldCheck,
  PlusCircle,
  Award,
  Vote,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  User,
  UploadCloud,
  AlertCircle,
  Loader2,
  Search,
  FileCheck,
  FileText,
  Coins,
  Printer,
  X,
  Eye,
  BookOpen,
  Copy,
  Check,
  FileCode2,
  Terminal,
  Cpu,
  GraduationCap,
  School,
  FileSpreadsheet,
  Code2,
  Activity,
  Server,
  Database,
  Medal,
  Briefcase,
  Building2,
  Hash,
  UserCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Edit3,
  LogOut,
  Sliders,
  Trash2,
  Menu,
  FileSignature,
  History,
  Compass,
  ArrowLeftRight,
} from 'lucide-react';
import { useProjectRegistry } from './hooks/useProjectRegistry.js';
import { uploadFileToIPFS, gatewayUrlFor, isDemoCid } from './utils/ipfs.js';
import { firebaseLogout, onFirebaseAuth } from './utils/firebase.js';
import AssignTribunalPanel from './components/AssignTribunalPanel.jsx';
import { CONTRACTS_CATALOG, UPEC_FACULTIES, CONTRACT_TYPES_CONFIG } from './data/contractsData.js';
import { savePdfToStorage, getPdfFromStorage, generateSampleUpecThesisBlob } from './utils/pdfStorage.js';
import LoginScreen from './components/LoginScreen.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import DeleteProjectModal from './components/DeleteProjectModal.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardView from './components/views/DashboardView.jsx';
import VerificationView from './components/views/VerificationView.jsx';
import UpcomingModuleView from './components/views/UpcomingModuleView.jsx';
import UPECTokenView from './components/views/UPECTokenView.jsx';
import PurchaseEscrowView from './components/views/PurchaseEscrowView.jsx';
import NetworkStatusView from './components/views/NetworkStatusView.jsx';
import TransactionHistoryView from './components/views/TransactionHistoryView.jsx';
import DatabaseView from './components/views/DatabaseView.jsx';
import UPECDiplomaDocument from './components/UPECDiplomaDocument.jsx';
import {
  getAppSettings,
  saveAppSettings,
  THEMES,
  getDatabaseProjects,
  saveDatabaseProject,
  deleteDatabaseProject,
  resetDatabaseToDefaults,
  getDatabaseUsers,
  saveDatabaseUser,
  deleteDatabaseUser,
  findProjectRecord,
  startDatabaseSync,
  stopDatabaseSync,
  clearLocalCache,
  isLocalMode,
} from './utils/upecDatabase.js';

// Datos personales (off-chain) de un proyecto on-chain. Se buscan por el hash SHA-256 del PDF
// que guarda el contrato; si no hay coincidencia exacta no se muestra ningún dato personal.
function getProjectMetadata(project) {
  return findProjectRecord(project) || {};
}

export default function App() {
  // Estado de Autenticación de Usuario (Inicio de Sesión / Registro para APK y Web)
  // Se inicia en null o leyendo de sessionStorage para que al abrir la aplicación SIEMPRE aparezca primero la Pantalla de Inicio / Login con el Búho de la UPEC
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (search.includes('preview=diploma') || search.includes('tab=certificate')) {
        return {
          name: 'Andrade Pérez Luis Fernando',
          cedula: '0400000001',
          role: 'estudiante',
          faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales',
          career: 'Carrera de Computación',
        };
      }
      const session = sessionStorage.getItem('upec_auth_session');
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    setCurrentUser(null);
    stopDatabaseSync();
    if (!isLocalMode) {
      firebaseLogout().catch(() => {});
      clearLocalCache();
    }
    try {
      sessionStorage.removeItem('upec_auth_session');
      localStorage.removeItem('upec_auth_session');
    } catch (err) {
      console.warn('Storage error:', err);
    }
    setNotification({
      type: 'info',
      message: 'Has cerrado sesión exitosamente. Bienvenido a la pantalla de acceso UPEC.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Limpiar cualquier sesión residual en localStorage para que la pantalla de inicio con el Búho UPEC aparezca siempre al abrir
  useEffect(() => {
    try {
      localStorage.removeItem('upec_auth_session');
    } catch {}
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (search.includes('tab=certificate') || search.includes('preview=diploma')) {
        return 'certificate';
      }
      if (search.includes('verify=')) return 'verify';
    } catch {}
    return 'dashboard';
  }); // 'dashboard', 'my-projects', 'register', 'vote', 'certificate', 'verify', 'escrow', etc.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCertId, setActiveCertId] = useState(null);
  const [selectedDiplomaSource, setSelectedDiplomaSource] = useState(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (search.includes('source=')) {
        const match = search.match(/source=([^&]+)/);
        if (match) return match[1];
      }
    } catch {}
    return 'active-blockchain';
  }); // 'active-blockchain' or 'sim-5', 'sim-1', etc.
  const [notification, setNotification] = useState(null);
  const [selectedCertificateProject, setSelectedCertificateProject] = useState(null);
  const [selectedDocumentProject, setSelectedDocumentProject] = useState(null);
  const [selectedContractCode, setSelectedContractCode] = useState(null);
  const [contractViewerTab, setContractViewerTab] = useState('code'); // 'code', 'functions'
  const [copiedText, setCopiedText] = useState(null);

  // Estados de Personalización, Base de Datos Local y Perfil de Usuario
  const [settings, setSettings] = useState(getAppSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [dbProjects, setDbProjects] = useState(getDatabaseProjects);

  // Sincronización con Firestore mientras haya sesión
  useEffect(() => {
    if (!currentUser) return undefined;
    return startDatabaseSync(currentUser);
  }, [currentUser]);

  // Con Firebase, si la sesión de Firebase Auth se cierra, se cierra también la de la aplicación
  useEffect(() => {
    if (isLocalMode) return undefined;
    return onFirebaseAuth((fbUser) => {
      if (!fbUser) setCurrentUser((u) => (u && u.authMethod === 'firebase' ? null : u));
    });
  }, []);

  useEffect(() => {
    const refresh = () => setDbProjects(getDatabaseProjects());
    window.addEventListener('upec_db_updated', refresh);
    return () => window.removeEventListener('upec_db_updated', refresh);
  }, []);
  const [expandedProjects, setExpandedProjects] = useState({ 1: true });

  const toggleProjectExpand = (id) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleUpdateSettings = (newSettings) => {
    const updated = saveAppSettings(newSettings);
    setSettings(updated);
  };

  const handleResetDatabase = () => {
    if (window.confirm('¿Restablecer toda la base de datos a los valores oficiales de la UPEC?')) {
      resetDatabaseToDefaults();
      setDbProjects(getDatabaseProjects());
      setNotification({
        type: 'success',
        message: 'Base de datos restablecida a los valores oficiales.',
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleConfirmDeleteProject = (projectId) => {
    deleteDatabaseProject(projectId);
    setDbProjects(getDatabaseProjects());
    setNotification({
      type: 'info',
      message: 'Proyecto de grado eliminado de la base de datos con éxito.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveProfile = (updatedProfile) => {
    saveDatabaseUser(updatedProfile);
    setCurrentUser(updatedProfile);
    try {
      sessionStorage.setItem('upec_auth_session', JSON.stringify(updatedProfile));
      localStorage.setItem('upec_auth_session', JSON.stringify(updatedProfile));
    } catch {}
    setNotification({
      type: 'success',
      message: 'Perfil institucional actualizado exitosamente.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Metadatos persistentes de proyectos (para asociar nombre de estudiante, cédula, facultad y nota a las tesis)
  const [projectMetadataMap, setProjectMetadataMap] = useState(() => {
    try {
      const saved = localStorage.getItem('upec_project_metadata');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Estados para el Visor Integral de Tesis y Documentos (Docentes y Tribunal)
  const [docViewerMode, setDocViewerMode] = useState('pdf'); // 'pdf' por defecto para ver la tesis de inmediato
  const [docViewerActiveChapter, setDocViewerActiveChapter] = useState(0); // 0: Portada & Dictamen, 1: Resumen & Justificación, 2: Metodología Web3, 3: Smart Contracts, 4: Quórum DAO & Firmas
  const [docViewerUploadedPdfUrl, setDocViewerUploadedPdfUrl] = useState(null);
  const [docViewerUploadedPdfName, setDocViewerUploadedPdfName] = useState(null);
  const [docViewerUploadedPdfSize, setDocViewerUploadedPdfSize] = useState(null);
  const [docViewerFontSize, setDocViewerFontSize] = useState('normal'); // 'normal', 'large'
  const [projectPdfMap, setProjectPdfMap] = useState({});

  // Estado para Modal de Edición de Datos del Graduando (Nombre, Cédula, Facultad, Carrera, Calificación)
  const [editingStudentProject, setEditingStudentProject] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('fiaca');
  const [editCareer, setEditCareer] = useState('Ingeniería en Computación');
  const [editScore, setEditScore] = useState('');
  const [editMention, setEditMention] = useState('');

  const handleOpenEditStudentModal = (project) => {
    if (!project) return;
    setEditingStudentProject(project);

    const meta = getProjectMetadata(project, projectMetadataMap);

    setEditStudentName(project.studentName || meta.studentName || '');
    setEditStudentId(project.studentId || meta.studentId || '');
    const matchedFac = UPEC_FACULTIES.find(
      (f) => f.name === (project.faculty || meta.faculty) || f.code === (project.facultyCode || meta.facultyCode)
    );
    const facId = matchedFac ? matchedFac.id : (project.facultyId || meta.facultyId || 'fiaca');
    setEditFacultyId(facId);
    setEditCareer(project.career || meta.career || (matchedFac ? matchedFac.careers[0] : 'Ingeniería en Computación'));
    setEditScore(project.score || meta.score || '');
    setEditMention(project.mention || meta.mention || '');
  };

  const handleSaveEditStudent = (e) => {
    if (e) e.preventDefault();
    if (!editingStudentProject) return;

    const facultyObj = UPEC_FACULTIES.find((f) => f.id === editFacultyId) || UPEC_FACULTIES[0];
    const cid = editingStudentProject.ipfsMetadataCID ? String(editingStudentProject.ipfsMetadataCID).trim() : '';
    const projId = editingStudentProject.id !== undefined && editingStudentProject.id !== null ? String(editingStudentProject.id) : '';
    const certId = editingStudentProject.certificateId !== undefined && editingStudentProject.certificateId !== null ? String(editingStudentProject.certificateId) : '';

    const updatedData = {
      studentName: editStudentName.trim(),
      studentId: editStudentId.trim(),
      faculty: facultyObj.name,
      facultyCode: facultyObj.code,
      facultyId: facultyObj.id,
      career: editCareer,
      score: editScore || '',
      mention: editMention || '',
      title: editingStudentProject.title || '',
    };

    // Los datos personales se guardan off-chain (Firestore), enlazados por el hash del PDF.
    if (editingStudentProject.documentHash) {
      saveDatabaseProject({ ...updatedData, documentHash: editingStudentProject.documentHash, projectId: editingStudentProject.id });
      setDbProjects(getDatabaseProjects());
    }
    void cid; void projId; void certId;

    if (editingStudentProject.id && simulatedContracts.some((c) => c.id === editingStudentProject.id)) {
      setSimulatedContracts((prev) =>
        prev.map((c) => (c.id === editingStudentProject.id ? { ...c, ...updatedData } : c))
      );
    }

    if (selectedCertificateProject && selectedCertificateProject.id === editingStudentProject.id) {
      setSelectedCertificateProject((prev) => ({
        ...prev,
        ...updatedData,
      }));
    }

    setEditingStudentProject(null);
    setNotification({
      type: 'success',
      message: `¡Datos del graduando actualizados exitosamente! Ahora el certificado muestra a: ${updatedData.studentName}.`,
    });
    setTimeout(() => setNotification(null), 6000);
  };

  // Función para abrir el visor de documento con carga automática del PDF de la tesis del estudiante
  const handleOpenDocumentViewer = async (project, preferredMode = 'pdf') => {
    if (!project) return;
    setSelectedDocumentProject(project);
    setDocViewerMode(preferredMode);

    const cid = project?.ipfsMetadataCID;
    const projId = project?.id;

    // 1. Verificar si ya tenemos el URL en memoria
    if (cid && projectPdfMap[cid]) {
      setDocViewerUploadedPdfUrl(projectPdfMap[cid].url);
      setDocViewerUploadedPdfName(projectPdfMap[cid].name);
      setDocViewerUploadedPdfSize(projectPdfMap[cid].size);
      return;
    }
    if (projId && projectPdfMap[`proj_${projId}`]) {
      setDocViewerUploadedPdfUrl(projectPdfMap[`proj_${projId}`].url);
      setDocViewerUploadedPdfName(projectPdfMap[`proj_${projId}`].name);
      setDocViewerUploadedPdfSize(projectPdfMap[`proj_${projId}`].size);
      return;
    }

    // 2. Recuperar de IndexedDB
    try {
      let stored = cid ? await getPdfFromStorage(cid) : null;
      if (!stored && projId) {
        stored = await getPdfFromStorage(`proj_${projId}`);
      }

      if (stored && stored.url) {
        setDocViewerUploadedPdfUrl(stored.url);
        setDocViewerUploadedPdfName(stored.name);
        setDocViewerUploadedPdfSize(stored.size);
        setProjectPdfMap((prev) => ({
          ...prev,
          ...(cid ? { [cid]: stored } : {}),
          ...(projId ? { [`proj_${projId}`]: stored } : {}),
        }));
        return;
      }
    } catch (err) {
      console.warn('Error al leer PDF de IndexedDB:', err);
    }

    // 3. Generar PDF oficial UPEC en caso de no tener PDF subido aún
    try {
      const sampleBlob = generateSampleUpecThesisBlob(project);
      const sampleUrl = URL.createObjectURL(sampleBlob);
      const sampleName = `Tesis_UPEC_${project.id || 1}_${(project.studentName || 'Estudiante_Demo').replace(/\s+/g, '_')}.pdf`;
      setDocViewerUploadedPdfUrl(sampleUrl);
      setDocViewerUploadedPdfName(sampleName);
      setDocViewerUploadedPdfSize(sampleBlob.size);
    } catch (e) {
      setDocViewerUploadedPdfUrl(null);
    }
  };

  // Estados para el Módulo de Smart Contracts y Simulador Dinámico
  const [simContractType, setSimContractType] = useState('actas');
  const [simContractName, setSimContractName] = useState('ActasDeGradoUPEC');
  const [simFacultyId, setSimFacultyId] = useState('fiaca');
  const [simCareer, setSimCareer] = useState('Ingeniería en Computación');
  const [simStudentName, setSimStudentName] = useState('Benítez Ruales María José');
  const [simStudentId, setSimStudentId] = useState('0400000002');
  const [simScore, setSimScore] = useState('9.85');
  const [simWrittenScore, setSimWrittenScore] = useState('9.70');
  const [simHours, setSimHours] = useState('240 Horas Reglamentarias');
  const [simMention, setSimMention] = useState('Aprobado con Mención de Honor (Magna Cum Laude)');
  const [simSenescytCode, setSimSenescytCode] = useState('SENESCYT-1024-2026-98214');
  const [simEntity, setSimEntity] = useState('GAD Provincial del Carchi • Tulcán');
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState(false);

  // Inicialización de contratos desplegados con los tipos representativos oficiales UPEC (Escala 0.00 a 10.00 Puntos)
  const [simulatedContracts, setSimulatedContracts] = useState([
    {
      id: 5,
      name: 'TituloOficialUPEC',
      type: 'actas',
      faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales',
      facultyCode: 'FIACA',
      career: 'Carrera de Computación',
      titleName: 'Ingeniero en Ciencias de la Computación',
      studentName: 'Andrade Pérez Luis Fernando',
      studentId: '0400000001',
      date: 'Tulcán, 24 de noviembre de 2026',
      score: '9.85',
      writtenScore: '9.80',
      mention: 'Aprobado con Mención de Honor (Magna Cum Laude)',
      address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      timestamp: '24 de noviembre de 2026',
      standard: 'ERC-721 / UPEC-TITULO',
      gasUsed: 1890200,
    },
    {
      id: 1,
      name: 'ActasDeGradoUPEC',
      type: 'actas',
      faculty: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
      facultyCode: 'FIACA',
      career: 'Carrera de Computación',
      titleName: 'Ingeniero en Ciencias de la Computación',
      studentName: 'Andrade Pérez Luis Fernando',
      studentId: '0400000001',
      date: 'Tulcán, 20 de octubre de 2026',
      score: '9.85',
      writtenScore: '9.70',
      mention: 'Aprobado con Mención de Honor (Magna Cum Laude)',
      address: '0x75b101fc17cdeacea51d2262d4a3c84578f8d91a',
      timestamp: '04:31:01 p. m.',
      standard: 'ERC-721 / UPEC-ACTAS',
      gasUsed: 1938814,
    },
    {
      id: 2,
      name: 'PosgradoMasterUPEC',
      type: 'posgrado',
      faculty: 'Dirección de Posgrado y Formación Continua',
      facultyCode: 'DIP',
      career: 'Maestría en Computación mención Inteligencia Artificial y Ciberseguridad',
      studentName: 'Ing. Carla Sofía Montenegro Vela, M.Sc.',
      studentId: '0400000003',
      score: '9.90',
      senescyt: 'SENESCYT-1024-2026-98214',
      mention: 'Mención de Excelencia en Investigación Científica',
      address: '0x6489f00bafcb856192be0c1fed93231ef9d34e2b',
      timestamp: '04:31:22 p. m.',
      standard: 'ERC-721 / UPEC-MASTER',
      gasUsed: 2015242,
    },
    {
      id: 3,
      name: 'PasantiasComunitariasUPEC',
      type: 'pasantias',
      faculty: 'Dirección de Vinculación y Prácticas Pre-Profesionales',
      facultyCode: 'DVP',
      career: 'Acreditación de Prácticas Pre-Profesionales',
      studentName: 'Diego Alejandro Paredes Lima',
      studentId: '0400000004',
      hours: '240 Horas Reglamentarias',
      entity: 'GAD Provincial del Carchi • Tulcán',
      score: '10.00 / 10.00 (Sobresaliente)',
      address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
      timestamp: '04:35:10 p. m.',
      standard: 'ERC-721 / UPEC-VINCULA',
      gasUsed: 1412090,
    },
    {
      id: 4,
      name: 'MeritoAcademicoUPEC',
      type: 'merito',
      faculty: 'Facultad de Comercio Internacional, Integración, Administración y Economía Empresarial (FCIIAEE)',
      facultyCode: 'FCIIAEE',
      career: 'Comercio Exterior y Negociación Internacional',
      studentName: 'Lic. Ana Lucía Cárdenas Ruiz',
      studentId: '0400000005',
      score: '9.94 / 10.00',
      mention: 'Medalla Sol Pasto de Oro • Mejor Egresada de la Promoción',
      resolution: 'RES-CU-UPEC-2026-088',
      address: '0x9024c653065a63901b0f156d4c0628286f91f3a2',
      timestamp: '04:40:45 p. m.',
      standard: 'ERC-721 / UPEC-MERIT',
      gasUsed: 1684500,
    },
  ]);

  const handleCopy = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 3000);
    } catch (e) {
      console.warn('Error al copiar al portapapeles:', e);
    }
  };

  // Estados del Formulario de Registro con Datos de Estudiante y Facultad
  const [formStudentName, setFormStudentName] = useState(() => currentUser?.name || '');
  const [formStudentId, setFormStudentId] = useState(() => currentUser?.cedula || '');
  const [formFacultyId, setFormFacultyId] = useState('fiaca');
  const [formCareer, setFormCareer] = useState('Ingeniería en Computación');
  const [formScore, setFormScore] = useState('');
  const [formDocHash, setFormDocHash] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIpfsCID, setFormIpfsCID] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploadingIPFS, setIsUploadingIPFS] = useState(false);
  const [ipfsStatus, setIpfsStatus] = useState(null);
  const [formError, setFormError] = useState('');

  // Filtros en Panel de Votación DAO
  const [searchTerm, setSearchTerm] = useState('');
  const [daoFilter, setDaoFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const {
    contractAddress,
    isConnected,
    userAddress,
    projects: onChainProjects,
    myProjects: onChainMyProjects,
    myNFTs: onChainMyNFTs,
    isLoadingProjects,
    refetchProjects,
    balanceData,
    requestFaucetFunds,
    isFauceting,
    registerProject,
    vote,
    finalizeProject,
    assignTribunal,
    verifyDocument,
    tribunals,
    isAdminOnChain,
    isDocenteOnChain,
    isWritePending,
    isConfirming,
    isConfirmed,
    txHash,
    writeError,
  } = useProjectRegistry();

  // Lista de proyectos: el estado, los votos y el tribunal vienen SIEMPRE del contrato.
  // De Firestore solo se agregan los datos personales, enlazados por el hash del PDF.
  const projects = (Array.isArray(onChainProjects) ? onChainProjects : []).map((p) => {
    const rec = findProjectRecord(p, dbProjects) || {};
    const trib = (tribunals && tribunals[p.id]) || { members: [], votedByMe: false };
    return {
      studentName: rec.studentName,
      studentId: rec.studentId,
      faculty: rec.faculty,
      facultyId: rec.facultyId,
      facultyCode: rec.facultyCode,
      career: rec.career,
      titleName: rec.titleName,
      score: rec.score,
      fileName: rec.fileName,
      fileSize: rec.fileSize,
      ...p,
      tribunal: trib.members,
      votedByMe: trib.votedByMe,
    };
  });

  // Proyectos del usuario autenticado (compatibilidad con MetaMask O login institucional)
  const myProjects = projects.filter((p) => {
    const matchesWallet = userAddress && p.submitter && p.submitter.toLowerCase() === userAddress.toLowerCase();
    const matchesUser = currentUser && (
      (p.studentId && currentUser.cedula && String(p.studentId).trim() === String(currentUser.cedula).trim()) ||
      (p.studentName && currentUser.name && p.studentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      (p.submitter && currentUser.email && p.submitter.toLowerCase() === currentUser.email.toLowerCase())
    );
    return matchesWallet || matchesUser;
  });

  const myNFTs = myProjects.filter((p) => Number(p.status) === 1 && Number(p.certificateId) > 0);

  const currentTheme = THEMES[settings.themeId] || THEMES.emerald;

  // Función para fondear cuenta en Hardhat Localhost
  const handleFaucetClick = async () => {
    try {
      await requestFaucetFunds();
      setNotification({
        type: 'success',
        message: 'Se han acreditado 100 ETH de prueba a tu billetera en Hardhat Localhost.',
      });
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'No se pudo conectar al Faucet de Hardhat: ' + (err.message || 'Error desconocido'),
      });
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  };

  // Refrescar lista automáticamente tras confirmación de transacción
  useEffect(() => {
    if (isConfirmed) {
      refetchProjects();
      setNotification({
        type: 'success',
        message: 'Transacción confirmada en la Blockchain con éxito.',
        tx: txHash,
      });
      const timer = setTimeout(() => setNotification(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, refetchProjects, txHash]);

  // Manejar errores de transacción
  useEffect(() => {
    if (writeError) {
      const msg = writeError.shortMessage || writeError.message || 'Error al ejecutar la transacción.';
      setNotification({
        type: 'error',
        message: msg,
      });
      const timer = setTimeout(() => setNotification(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [writeError]);

  // Al iniciar sesión, el formulario toma los datos del perfil
  useEffect(() => {
    if (currentUser?.role === 'student') {
      setFormStudentName((v) => v || currentUser.name || '');
      setFormStudentId((v) => v || currentUser.cedula || '');
    }
  }, [currentUser]);

  const showNotice = (type, message, ms = 5000) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), ms);
  };

  // Traduce los errores del contrato a mensajes claros
  const explainError = (err, projectId) => {
    const raw = err?.shortMessage || err?.message || 'Error en la transacción';
    const lower = raw.toLowerCase();
    if (lower.includes('nonce')) return 'MetaMask desincronizado (nonce). En MetaMask: Configuración > Avanzado > Borrar datos de actividad.';
    if (lower.includes('user rejected') || lower.includes('denied')) return 'Transacción cancelada en MetaMask.';
    if (raw.includes('NotTribunalMember')) return 'Esta billetera no integra el tribunal del proyecto. Solo votan los tres docentes asignados por Secretaría.';
    if (raw.includes('AlreadyVoted')) return 'Esta billetera ya votó en este proyecto.';
    if (raw.includes('TribunalNotAssigned')) return 'Secretaría todavía no asigna el tribunal de este proyecto.';
    if (raw.includes('VotingClosed')) return 'El plazo de votación terminó.';
    if (raw.includes('VotingStillOpen')) return 'El plazo de votación todavía está abierto.';
    if (raw.includes('NotPending')) return `El proyecto #${projectId} ya fue aprobado o rechazado.`;
    if (raw.includes('DuplicateDocument')) return 'Ese PDF ya está registrado en la cadena.';
    if (raw.includes('InvalidTribunalMember')) return 'Uno de los integrantes no tiene rol docente en el contrato, está repetido o es el autor.';
    if (raw.includes('AccessControlUnauthorizedAccount')) return 'Esta billetera no tiene permisos de Secretaría en el contrato.';
    if (raw.includes('ProjectNotFound')) return `El proyecto #${projectId} no existe en el contrato.`;
    return raw;
  };

  // Al elegir el PDF: se calcula su hash SHA-256 y se sube a IPFS mediante el proxy
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    try {
      const blobUrl = URL.createObjectURL(file);
      setDocViewerUploadedPdfUrl(blobUrl);
      setDocViewerUploadedPdfName(file.name);
      setDocViewerUploadedPdfSize(file.size);
    } catch {
      // ignore
    }
    setIsUploadingIPFS(true);
    setFormError('');

    try {
      const res = await uploadFileToIPFS(file);
      setFormIpfsCID(res.cid);
      setFormDocHash(res.documentHash);
      setIpfsStatus(res);
      showNotice(
        res.isDemo ? 'info' : 'success',
        res.isDemo
          ? 'Modo demostración: IPFS no está disponible; el PDF queda solo en este navegador. Se registrará su hash SHA-256.'
          : `PDF subido a IPFS: ${res.cid.substring(0, 16)}…`
      );
    } catch (err) {
      console.error('Error al procesar el PDF:', err);
      setFormError(err.message || 'No se pudo procesar el archivo.');
    } finally {
      setIsUploadingIPFS(false);
    }
  };

  // Registro: primero en la cadena; solo si la transacción se confirma se guardan los datos personales en Firestore
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isConnected) {
      setFormError('Conecta tu billetera Web3 antes de registrar el proyecto.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('El título del proyecto es obligatorio.');
      return;
    }
    if (!uploadedFile || !formIpfsCID.trim() || !formDocHash) {
      setFormError('Adjunta el PDF del trabajo de titulación.');
      return;
    }
    if (!formStudentName.trim() || !formStudentId.trim()) {
      setFormError('Ingresa el nombre y la cédula del estudiante.');
      return;
    }

    try {
      const { projectId } = await registerProject({
        title: formTitle.trim(),
        description: formDescription.trim(),
        ipfsCID: formIpfsCID.trim(),
        documentHash: formDocHash,
      });

      const facultyObj = UPEC_FACULTIES.find((f) => f.id === formFacultyId) || UPEC_FACULTIES[0];
      saveDatabaseProject({
        documentHash: formDocHash,
        projectId,
        title: formTitle.trim(),
        studentName: formStudentName.trim(),
        studentId: formStudentId.trim(),
        faculty: facultyObj.name,
        facultyCode: facultyObj.code,
        facultyId: facultyObj.id,
        career: formCareer,
        score: formScore || '',
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        ipfsDemo: Boolean(ipfsStatus?.isDemo),
      });
      setDbProjects(getDatabaseProjects());

      // Copia local del PDF para el visor (en modo demostración es la única copia)
      await savePdfToStorage(formIpfsCID.trim(), uploadedFile);
      if (projectId) await savePdfToStorage(`proj_${projectId}`, uploadedFile);
      const pdfUrl = URL.createObjectURL(uploadedFile);
      const pdfData = { url: pdfUrl, name: uploadedFile.name, size: uploadedFile.size, blob: uploadedFile };
      setProjectPdfMap((prev) => ({ ...prev, [formIpfsCID.trim()]: pdfData, ...(projectId ? { [`proj_${projectId}`]: pdfData } : {}) }));

      setFormTitle('');
      setFormDescription('');
      setFormIpfsCID('');
      setFormDocHash('');
      setUploadedFile(null);
      setIpfsStatus(null);
      setActiveTab('my-projects');
      showNotice('success', `Proyecto #${projectId ?? ''} registrado. Secretaría debe asignar el tribunal para iniciar la votación.`);
    } catch (err) {
      setFormError(explainError(err));
    }
  };

  // Voto del tribunal: solo en la cadena
  const handleVote = async (projectId, support) => {
    try {
      await vote(projectId, support);
      if (refetchProjects) await refetchProjects();
      showNotice('success', support ? 'Voto a favor registrado en la cadena.' : 'Voto en contra registrado: el proyecto queda rechazado.', 4000);
    } catch (err) {
      console.error('Error al votar:', err);
      showNotice('error', explainError(err, projectId), 7000);
    }
  };

  // Cierre por vencimiento del plazo (rechazo si no hubo tres votos a favor)
  const handleFinalize = async (projectId) => {
    try {
      await finalizeProject(projectId);
      if (refetchProjects) await refetchProjects();
      showNotice('info', `Proyecto #${projectId} cerrado por vencimiento del plazo.`);
    } catch (err) {
      showNotice('error', explainError(err, projectId), 7000);
    }
  };

  // Secretaría asigna el tribunal de tres docentes
  const handleAssignTribunal = async (projectId, members) => {
    try {
      await assignTribunal(projectId, members);
      if (refetchProjects) await refetchProjects();
      showNotice('success', `Tribunal asignado al proyecto #${projectId}. Empieza el plazo de 7 días.`);
    } catch (err) {
      showNotice('error', explainError(err, projectId), 7000);
    }
  };

  // Manejar cambio dinámico del tipo de contrato en el simulador
  const handleContractTypeChange = (newType) => {
    setSimContractType(newType);
    const config = CONTRACT_TYPES_CONFIG[newType];
    if (config) {
      setSimContractName(config.name);
      if (newType === 'posgrado') {
        setSimFacultyId('posgrado');
        setSimCareer('Maestría en Computación mención Inteligencia Artificial y Ciberseguridad');
        setSimStudentName('Ing. Carla Sofía Montenegro Vela, M.Sc.');
        setSimStudentId('0400000003');
        setSimScore('9.90');
        setSimSenescytCode('SENESCYT-1024-2026-98214');
        setSimMention('Mención de Excelencia en Investigación Científica');
      } else if (newType === 'pasantias') {
        setSimFacultyId('vinculacion');
        setSimCareer('Acreditación de Prácticas Pre-Profesionales');
        setSimStudentName('Diego Alejandro Paredes Lima');
        setSimStudentId('0400000004');
        setSimHours('240 Horas Reglamentarias');
        setSimEntity('GAD Provincial del Carchi • Tulcán');
        setSimScore('10.00 / 10.00 (Sobresaliente)');
      } else if (newType === 'merito') {
        setSimFacultyId('fciiaee');
        setSimCareer('Comercio Exterior y Negociación Internacional');
        setSimStudentName('Lic. Ana Lucía Cárdenas Ruiz');
        setSimStudentId('0400000005');
        setSimScore('9.94 / 10.00');
        setSimMention('Medalla Sol Pasto de Oro • Mejor Egresada de la Promoción');
      } else {
        setSimFacultyId('fiaca');
        setSimCareer('Ingeniería en Computación');
        setSimStudentName('Benítez Ruales María José');
        setSimStudentId('0400000002');
        setSimScore('9.85');
        setSimWrittenScore('9.70');
        setSimMention('Aprobado con Mención de Honor (Magna Cum Laude)');
      }
    }
  };

  const handleSimulateDeploy = () => {
    setIsSimulatingDeploy(true);
    setTimeout(() => {
      const hexChars = '0123456789abcdef';
      let mockAddr = '0x';
      for (let i = 0; i < 40; i++) {
        mockAddr += hexChars[Math.floor(Math.random() * 16)];
      }

      const facultyObj = UPEC_FACULTIES.find((f) => f.id === simFacultyId) || UPEC_FACULTIES[0];

      const newContract = {
        id: Date.now(),
        name: simContractName || 'ContratoUPEC',
        type: simContractType,
        faculty: facultyObj.name,
        facultyCode: facultyObj.code,
        career: simCareer,
        studentName: simStudentName || 'Benítez Ruales María José',
        studentId: simStudentId || '0400000002',
        score: simScore || '9.85',
        writtenScore: simWrittenScore || '9.70',
        hours: simHours || '240 Horas Reglamentarias',
        mention: simMention || 'Aprobado con Mención de Honor (Magna Cum Laude)',
        senescyt: simSenescytCode || 'SENESCYT-1024-2026-98214',
        entity: simEntity || 'GAD Provincial del Carchi • Tulcán',
        address: mockAddr,
        timestamp: new Date().toLocaleTimeString('es-EC'),
        standard:
          simContractType === 'actas'
            ? 'ERC-721 / UPEC-ACTAS'
            : simContractType === 'posgrado'
            ? 'ERC-721 / UPEC-MASTER'
            : simContractType === 'pasantias'
            ? 'ERC-721 / UPEC-VINCULA'
            : 'ERC-721 / UPEC-MERIT',
        gasUsed: Math.floor(1750000 + Math.random() * 450000),
      };

      setSimulatedContracts((prev) => [newContract, ...prev]);
      setIsSimulatingDeploy(false);
      setNotification({
        type: 'success',
        message: `Contrato '${newContract.name}' (${newContract.standard}) desplegado con éxito para ${newContract.studentName}. Dirección: ${formatAddress(mockAddr)}`,
      });
      setTimeout(() => setNotification(null), 7000);
    }, 1200);
  };

  // Abrir Diploma / Certificado específico de un contrato modular
  const handleViewContractCertificate = (c) => {
    const certObj = {
      id: c.id || 1,
      certificateId: 100 + ((c.id || 1) % 900),
      contractType: c.type || 'actas',
      studentName: c.studentName || 'Benítez Ruales María José',
      studentId: c.studentId || '0400000002',
      score: c.score || '9.85',
      writtenScore: c.writtenScore || '9.70',
      hours: c.hours || '240 Horas Reglamentarias',
      mention: c.mention || 'Aprobado con Mención de Honor (Magna Cum Laude)',
      senescyt: c.senescyt || 'SENESCYT-1024-2026-98214',
      entity: c.entity || 'GAD Provincial del Carchi • Tulcán',
      title:
        c.type === 'actas'
          ? `Acta de Grado de Demostración y Defensa Oral - ${c.career || 'Ingeniería en Computación'}`
          : c.type === 'posgrado'
          ? `Título de Maestría & Posgrado (Demostración Académica) - ${c.career || 'Cuarto Nivel'}`
          : c.type === 'pasantias'
          ? `Certificación de Demostración de Prácticas Pre-Profesionales`
          : `Reconocimiento al Mérito Académico (Demostración)`,
      description:
        c.type === 'actas'
          ? `Acreditación de demostración de sustentación oral de grado emitida mediante el Smart Contract ${c.standard} en la ${c.faculty}. Registrado con Quórum Unánime 3/3 en la Blockchain de investigación de la Universidad Politécnica Estatal del Carchi.`
          : c.type === 'posgrado'
          ? `Título de cuarto nivel de demostración conforme a Reglas Académicas Simuladas (Demostración de Tesis).`
          : c.type === 'pasantias'
          ? `Certificación académica de prueba de cumplimiento de ${c.hours || '240 Horas'} en la entidad ${c.entity || 'GAD Provincial del Carchi'} con calificación de desempeño de ${c.score || '10.00 / 10.00'}.`
          : `Distinción magna otorgada al egresado con fines académicos por alcanzar un promedio simulado de ${c.score || '9.94/10'} y conferir la ${c.mention || 'Medalla Sol Pasto de Oro'}.`,
      submitter: userAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      ipfsMetadataCID: 'bafy3e8300363677b5375a0c0c3540f8cb75dc3f61ee63cb07e723d9c2d',
      votesFor: 3,
      votesAgainst: 0,
      contractAddress: c.address || contractAddress,
      faculty: c.faculty || 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
      facultyCode: c.facultyCode || 'FIACA',
      career: c.career || 'Ingeniería en Computación',
      standard: c.standard || 'ERC-721 URIStorage',
      isContractCert: true,
    };
    setSelectedCertificateProject(certObj);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const now = Math.floor(Date.now() / 1000);

  // Proyectos filtrados para el panel DAO
  const filteredDaoProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.submitter.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (daoFilter === 'pending') return p.status === 0;
    if (daoFilter === 'approved') return p.status === 1;
    if (daoFilter === 'rejected') return p.status === 2;
    return true;
  });

  const approvedProjects = projects.filter((p) => p.status === 1);

  // Resolver diploma activo para la pestaña principal de Diploma Oficial NFT
  const displayDiploma = (() => {
    // Caso 1: Selección de un contrato desplegado/simulado específico
    if (selectedDiplomaSource && selectedDiplomaSource.startsWith('sim-')) {
      const simId = Number(selectedDiplomaSource.replace('sim-', ''));
      const simObj = simulatedContracts.find((c) => c.id === simId) || simulatedContracts[0];
      if (simObj) {
        return {
          id: simObj.id,
          certificateId: 100 + (simObj.id % 900),
          contractType: simObj.type,
          studentName: simObj.studentName,
          studentId: simObj.studentId,
          score: simObj.score,
          writtenScore: simObj.writtenScore,
          hours: simObj.hours,
          mention: simObj.mention,
          senescyt: simObj.senescyt,
          entity: simObj.entity,
          title:
            simObj.type === 'actas'
              ? `Acta de Grado de Demostración y Defensa Oral - ${simObj.career}`
              : simObj.type === 'posgrado'
              ? `Título de Maestría & Posgrado (Demostración Académica) - ${simObj.career}`
              : simObj.type === 'pasantias'
              ? `Certificación de Demostración de Prácticas Pre-Profesionales`
              : `Reconocimiento al Mérito Académico (Demostración)`,
          description: `Emisión simulada para investigación académica mediante el Smart Contract ${simObj.name} (${simObj.standard}) en la ${simObj.faculty}. Registrado con Quórum Unánime 3/3 en la Blockchain de investigación de la Universidad Politécnica Estatal del Carchi.`,
          submitter: userAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          ipfsMetadataCID: 'bafy3e8300363677b5375a0c0c3540f8cb75dc3f61ee63cb07e723d9c2d',
          votesFor: 3,
          votesAgainst: 0,
          contractAddress: simObj.address,
          faculty: simObj.faculty,
          facultyCode: simObj.facultyCode || 'FIACA',
          career: simObj.career,
          standard: simObj.standard,
          isContractCert: true,
        };
      }
    }

    // Caso 2: Selección de una tesis registrada en la Blockchain
    const baseProj =
      (activeCertId ? projects.find((p) => p.id === activeCertId) : null) ||
      (selectedDiplomaSource && selectedDiplomaSource.startsWith('proj-')
        ? projects.find((p) => p.id === Number(selectedDiplomaSource.replace('proj-', '')))
        : null) ||
      approvedProjects[0] ||
      projects[0] ||
      null;

    if (!baseProj) {
      // Fallback al primer contrato simulado si no hay proyectos
      if (simulatedContracts.length > 0) {
        const fallbackSim = simulatedContracts[0];
        return {
          id: fallbackSim.id,
          certificateId: 101,
          contractType: fallbackSim.type,
          studentName: fallbackSim.studentName,
          studentId: fallbackSim.studentId,
          score: fallbackSim.score,
          writtenScore: fallbackSim.writtenScore,
          hours: fallbackSim.hours,
          mention: fallbackSim.mention,
          senescyt: fallbackSim.senescyt,
          entity: fallbackSim.entity,
          title: fallbackSim.name,
          description: `Acreditación de demostración emitida mediante el Smart Contract ${fallbackSim.standard}.`,
          submitter: userAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          ipfsMetadataCID: 'bafy3e8300363677b5375a0c0c3540f8cb75dc3f61ee63cb07e723d9c2d',
          votesFor: 3,
          votesAgainst: 0,
          contractAddress: fallbackSim.address,
          faculty: fallbackSim.faculty,
          facultyCode: fallbackSim.facultyCode || 'FIACA',
          career: fallbackSim.career,
          standard: fallbackSim.standard,
          isContractCert: true,
        };
      }
      return null;
    }

    // Enriquecer con metadatos guardados del autor usando el helper universal getProjectMetadata
    const meta = getProjectMetadata(baseProj, projectMetadataMap);

    return {
      ...baseProj,
      studentName: meta.studentName || baseProj.studentName || 'Sin datos personales',
      studentId: meta.studentId || baseProj.studentId || '—',
      faculty: meta.faculty || baseProj.faculty || 'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)',
      facultyCode: meta.facultyCode || baseProj.facultyCode || 'FIACA',
      career: meta.career || baseProj.career || 'Ingeniería en Computación',
      score: meta.score || baseProj.score || '—',
      writtenScore: meta.writtenScore || baseProj.writtenScore || '9.70',
      mention: meta.mention || baseProj.mention || 'Aprobado con Mención de Honor (Magna Cum Laude)',
      contractType: meta.contractType || baseProj.contractType || 'actas',
      standard: meta.standard || baseProj.standard || 'ERC-721 URIStorage',
    };
  })();

  const activeDiplomaProject = displayDiploma;

  // Verificación pública desde el QR: no exige iniciar sesión (lectura del contrato)
  const isPublicVerify = typeof window !== 'undefined' && window.location.search.includes('verify=');
  if (!currentUser && isPublicVerify) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <VerificationView projects={projects} verifyDocument={verifyDocument} primaryColor={currentTheme.primary} />
        </div>
      </div>
    );
  }

  // Si el usuario no ha iniciado sesión, mostrar la Pantalla de Inicio / Registro Oficial UPEC (APK / Web)
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          try {
            sessionStorage.setItem('upec_auth_session', JSON.stringify(user));
          } catch (err) {
            console.warn('Storage error:', err);
          }
          if (user.name) {
            setFormStudentName(user.name);
          }
          if (user.cedula) {
            setFormStudentId(user.cedula);
          }
          if (user.role === 'admin') {
            setActiveTab('dashboard');
          } else if (user.role === 'docente') {
            setActiveTab('vote');
          } else {
            setActiveTab('dashboard');
          }
          const roleLabel =
            user.role === 'admin'
              ? 'Secretaría General / Administradora'
              : user.role === 'docente'
              ? 'Tribunal Docente DAO'
              : 'Graduando Titulado';
          setNotification({
            type: 'success',
            message: `¡Bienvenido al Sistema UPEC Web3, ${user.name}! Sesión iniciada como ${roleLabel}.`,
          });
          setTimeout(() => setNotification(null), 6000);
        }}
        isConnected={isConnected}
        userAddress={userAddress}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-700 selection:text-white">
      {/* Barra de bandera tricolor superior institucional UPEC (Verde, Amarillo, Blanco) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#007A3D] via-[#FBBF24] to-[#007A3D]" />

      {/* Aviso Institucional Permanente de Prototipo (RF-32) */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-1.5 text-center text-[11px] sm:text-xs font-medium flex items-center justify-center space-x-2">
        <span className="font-bold bg-amber-400 text-slate-950 text-[10px] uppercase px-2 py-0.5 rounded-full shadow-2xs">
          RF-32
        </span>
        <span className="truncate sm:whitespace-normal font-semibold">
          Entorno Académico Experimental UPEC — Sin validez legal oficial.
        </span>
      </div>

      {/* 1. Header Institucional UPEC & Web3 Connect */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            {/* Botón Hamburguesa Móvil (Visible únicamente en celulares y tablets < lg) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition focus:outline-none"
              title="Abrir menú de navegación"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5 text-emerald-800" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shadow-sm border border-slate-200">
              <img src="/upec-logo.png" alt="Logo UPEC" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black tracking-tight text-slate-900">UPEC</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    Web3 DAO
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 hidden md:inline-block">
                    Prototipo • FIACA
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 font-medium hidden sm:block">
                Universidad Politécnica Estatal del Carchi • Prototipo Académico de Titulación Web3
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isConnected && (
              <button
                type="button"
                onClick={handleFaucetClick}
                disabled={isFauceting}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-sm"
                title="Recargar 100 ETH de prueba en el nodo local Hardhat"
              >
                {isFauceting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <Coins className="w-3.5 h-3.5 text-slate-950" />
                )}
                <span>
                  {isFauceting
                    ? 'Acreditando...'
                    : balanceData
                    ? `${Number(balanceData.formatted).toFixed(2)} ETH`
                    : 'Faucet (100 ETH)'}
                </span>
              </button>
            )}

            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />

            {/* Botón de Barra de Configuración y Personalización Visual */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
              title="Personalizar colores, tema visual y despliegues"
            >
              <Sliders className="w-4 h-4 text-emerald-700" />
              <span className="hidden xl:inline">Configuración</span>
            </button>

            {/* Perfil del Usuario Autenticado y Botón de Salir / Logout */}
            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 transition text-left group"
                  title="Ver y editar mi perfil de usuario"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                    {currentUser.avatar || '👨‍🎓'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold">
                      {currentUser.role === 'docente'
                        ? 'Docente Tribunal DAO'
                        : currentUser.role === 'admin'
                        ? 'Secretaría Académica'
                        : 'Graduando Titulado'}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold transition border border-slate-200 shadow-2xs"
                  title="Cerrar sesión institucional y volver a la pantalla de inicio"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Barra de Alertas y Notificaciones Flotantes */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between shadow-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-900/5'
                : 'bg-rose-50 border-rose-300 text-rose-900 shadow-rose-900/5'
            }`}
          >
            <div className="flex items-center space-x-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{notification.message}</span>
            </div>
            {notification.tx && (
              <span className="text-xs font-mono underline text-emerald-700">
                Tx: {notification.tx.substring(0, 10)}...
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Layout Principal con Menú Lateral Plegable y Contenido Dinámico */}
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 flex-1 flex gap-6 relative items-start">
        {/* Menú Lateral (Sidebar) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          currentUser={currentUser}
          currentTheme={currentTheme}
          counts={{
            totalProjects: projects.length || dbProjects.length,
            approvedProjects: approvedProjects.length,
            myProjects: myProjects.length,
            dbProjectsCount: dbProjects.length,
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
        />

        {/* Área de Contenido Principal Dinámico */}
        <main className="flex-1 min-w-0 space-y-6 pb-12">
          {/* MÓDULO: PANEL DE INICIO */}
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              currentTheme={currentTheme}
              projects={projects}
              approvedProjects={approvedProjects}
              myProjects={myProjects}
              onSelectTab={setActiveTab}
              onOpenDocumentViewer={handleOpenDocumentViewer}
              primaryColor={currentTheme.primary}
            />
          )}

          {/* MÓDULO: GESTIÓN DE BASE DE DATOS INSTITUCIONAL (MOVILIZADO AL SIDEBAR) */}
          {activeTab === 'database' && (
            <DatabaseView
              chainProjects={projects}
              currentUser={currentUser}
              currentTheme={currentTheme}
              onSelectTab={setActiveTab}
              onOpenDocumentViewer={handleOpenDocumentViewer}
              setNotification={setNotification}
            />
          )}

          {/* MÓDULO: VERIFICACIÓN DE CERTIFICADOS */}
          {activeTab === 'verify' && (
            <VerificationView
              projects={projects}
              verifyDocument={verifyDocument}
              onSelectTab={setActiveTab}
              onOpenDocumentViewer={handleOpenDocumentViewer}
              primaryColor={currentTheme.primary}
            />
          )}

          {/* MÓDULO: CONTRATOS DE COMPRAVENTA Y CUSTODIA ESCROW (FASE 4) */}
          {(activeTab === 'escrow' || activeTab === 'my-contracts') && (
            <PurchaseEscrowView
              currentTheme={currentTheme}
              userAddress={userAddress}
              formatAddress={formatAddress}
              setNotification={setNotification}
            />
          )}

          {/* MÓDULO: MONEDA ACADÉMICA UPECT Y TRANSFERENCIAS (FASE 4) */}
          {(activeTab === 'token-upect' || activeTab === 'transfer') && (
            <UPECTokenView
              currentTheme={currentTheme}
              userAddress={userAddress}
              formatAddress={formatAddress}
              setNotification={setNotification}
            />
          )}

          {/* MÓDULO: HISTORIAL DE TRANSACCIONES AUDITABLES (FASE 4) */}
          {activeTab === 'history' && (
            <TransactionHistoryView
              currentTheme={currentTheme}
              userAddress={userAddress}
              setNotification={setNotification}
            />
          )}

          {/* MÓDULO: ESTADO DE LA RED BLOCKCHAIN (FASE 4) */}
          {activeTab === 'network' && (
            <NetworkStatusView
              currentTheme={currentTheme}
              setNotification={setNotification}
            />
          )}

          {/* MÓDULO: EXPLORADOR DE TRANSACCIONES Y BLOQUES (FASE 4) */}
          {activeTab === 'explorer' && (
            <TransactionHistoryView
              currentTheme={currentTheme}
              userAddress={userAddress}
              setNotification={setNotification}
            />
          )}

          {/* ================================================================= */}
          {/* PANEL 0: CERTIFICADO DE DEMOSTRACIÓN NFT UPEC (VISTA PRINCIPAL)   */}
          {/* ================================================================= */}
        {activeTab === 'certificate' && (
          <div className="space-y-6">
            {/* Barra Superior de Control y Selector de Diplomas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>Certificado de Demostración NFT</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      Reglas Académicas Simuladas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Emisión simulada para investigación académica en el contexto de la Universidad Politécnica Estatal del Carchi.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {activeDiplomaProject && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                      title="Imprimir Certificado de Demostración o Guardar como PDF"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Imprimir / Exportar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocumentViewer(activeDiplomaProject, 'pdf')}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition shadow-sm"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <span>Leer Tesis en PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Barra de Selección de Certificados / Contratos Inteligentes */}
            <div className="bg-slate-100/90 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>Seleccionar Diploma o Acta para Visualizar en Pantalla:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {simulatedContracts.length + approvedProjects.length} Certificados Disponibles
                </span>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
                {/* Contratos Desplegados y Simulados */}
                {simulatedContracts.map((c) => (
                  <button
                    key={`sim-${c.id}`}
                    onClick={() => setSelectedDiplomaSource(`sim-${c.id}`)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                      selectedDiplomaSource === `sim-${c.id}`
                        ? 'bg-[#007A3D] text-white shadow-sm border border-amber-400'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{c.name} • {c.studentName?.split(' ')[0]} {c.studentName?.split(' ')[1] || ''}</span>
                    <span className="text-[10px] opacity-80 font-mono">({c.score})</span>
                  </button>
                ))}

                {/* Proyectos Blockchain Aprobados */}
                {approvedProjects.map((p) => (
                  <button
                    key={`proj-${p.id}`}
                    onClick={() => {
                      setSelectedDiplomaSource(`proj-${p.id}`);
                      setActiveCertId(p.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                      selectedDiplomaSource === `proj-${p.id}`
                        ? 'bg-[#007A3D] text-white shadow-sm border border-amber-400'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Tesis #{p.id} On-Chain</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Barra Superior de Notificación y Edición Rápida de Datos del Graduando */}
            {activeDiplomaProject && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs print:hidden">
                <div className="flex items-center space-x-2.5">
                  <UserCheck className="w-5 h-5 text-amber-700 shrink-0" />
                  <span className="text-amber-950 font-medium">
                    Graduando Titulado:{' '}
                    <strong className="text-slate-950 font-black">{activeDiplomaProject.studentName || 'Sin datos personales'}</strong>{' '}
                    (C.I. {activeDiplomaProject.studentId || '—'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditStudentModal(activeDiplomaProject)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Personalizar / Editar Mis Datos</span>
                </button>
              </div>
            )}

            {/* CASO A: Hay al menos un diploma aprobado (o proyecto disponible) */}
            {activeDiplomaProject ? (
              <div id="upec-diploma-print" className="my-3">
                <UPECDiplomaDocument
                  project={activeDiplomaProject}
                  onOpenEditModal={handleOpenEditStudentModal}
                />
              </div>
            ) : (
              /* CASO B: Aún no se ha registrado ningún proyecto */
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No hay Proyectos o Certificados Emitidos Aún</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Para emitir el primer Certificado de Demostración NFT de la UPEC, registra una tesis en la pestaña de registro o accede a la votación DAO.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-2 mx-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Registrar Primer Proyecto de Tesis</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PANEL 1: REGISTRAR PROYECTO & ENLAZAR IPFS                        */}
        {/* ================================================================= */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 mb-6">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar Proyecto de Titulación</h3>
                <p className="text-xs text-slate-500">
                  Publica tu investigación en la blockchain y sométela a validación DAO del Tribunal de la UPEC.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {isConnected && balanceData && Number(balanceData.formatted) < 0.005 && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900">Saldo insuficiente para gas en red local:</strong>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Tu cuenta tiene {Number(balanceData.formatted).toFixed(4)} ETH. Necesitas gas de red para enviar la transacción a Hardhat.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFaucetClick}
                  disabled={isFauceting}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 shrink-0 flex items-center space-x-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{isFauceting ? 'Recargando...' : 'Recargar 100 ETH'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {/* Apartado Oficial del Graduando / Estudiante */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>Datos Oficiales del Graduando / Investigador UPEC</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nombre Completo del Estudiante *
                    </label>
                    <input
                      type="text"
                      required
                      value={formStudentName}
                      onChange={(e) => setFormStudentName(e.target.value)}
                      placeholder="Ej. Benítez Ruales María José"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cédula de Identidad Ciudadana *
                    </label>
                    <input
                      type="text"
                      required
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      placeholder="Ej. 0400000002"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Facultad Institucional UPEC *
                    </label>
                    <select
                      value={formFacultyId}
                      onChange={(e) => {
                        const newFacId = e.target.value;
                        setFormFacultyId(newFacId);
                        const facObj = UPEC_FACULTIES.find((f) => f.id === newFacId);
                        if (facObj && facObj.careers.length > 0) {
                          setFormCareer(facObj.careers[0]);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 transition"
                    >
                      {UPEC_FACULTIES.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.code} - {fac.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Carrera o Especialidad *
                    </label>
                    <select
                      value={formCareer}
                      onChange={(e) => setFormCareer(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 transition"
                    >
                      {(UPEC_FACULTIES.find((f) => f.id === formFacultyId) || UPEC_FACULTIES[0]).careers.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Calificación de Sustentación / Nota Oficial (Escala Oficial 0.00 - 10.00 Puntos)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formScore}
                    onChange={(e) => setFormScore(e.target.value)}
                    placeholder="Ej. 9.85"
                    className="w-full sm:w-48 px-4 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Título del Trabajo de Titulación / Tesis *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Arquitectura Descentralizada con Smart Contracts en la UPEC"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Resumen Ejecutivo (Abstract)
                </label>
                <textarea
                  rows="3"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe los objetivos, metodología y propuesta tecnológica de la tesis..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition resize-none"
                />
              </div>

              {/* Zona de Subida de Documento a IPFS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Documento Digital de Tesis / Proyecto (PDF) *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-5 bg-slate-50 text-center transition">
                  <input
                    type="file"
                    id="thesis-file-input"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="thesis-file-input" className="cursor-pointer block">
                    {isUploadingIPFS ? (
                      <div className="flex flex-col items-center justify-center space-y-2 py-3">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        <span className="text-xs font-semibold text-emerald-800">
                          Procesando documento y generando Hash IPFS...
                        </span>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                        <div className="flex items-center space-x-3 truncate">
                          <FileCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{uploadedFile.name}</p>
                            <p className="text-[11px] text-emerald-800 font-medium">
                              {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Procesado para IPFS
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0 ml-2">
                          Cambiar archivo
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2 py-4">
                        <UploadCloud className="w-8 h-8 text-slate-400 hover:text-emerald-600 transition" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Haz clic aquí para seleccionar o arrastra el PDF de tu tesis
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            El documento se ancla inmutablemente en IPFS para asegurar trazabilidad y no-repudio.
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hash IPFS Inmutable (CID) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormIpfsCID('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
                    }
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
                  >
                    Usar CID de prueba
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formIpfsCID}
                    onChange={(e) => setFormIpfsCID(e.target.value)}
                    placeholder="Se autocompleta al subir el archivo o escribe bafy... / Qm..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <UploadCloud className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                {formIpfsCID && (
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold">✓ Hash criptográfico vinculado</span>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${formIpfsCID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline inline-flex items-center space-x-1 font-medium"
                    >
                      <span>Auditar en Gateway IPFS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Plazo de Votación DAO
                </label>
                <div className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-700">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>7 Días (Periodo estándar del Smart Contract UPEC)</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isWritePending || isConfirming || !isConnected}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-sm transition active:scale-95"
                >
                  {(isWritePending || isConfirming) && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>
                    {!isConnected
                      ? 'Conecta tu Billetera para Registrar'
                      : isWritePending
                      ? 'Esperando firma en Wallet...'
                      : isConfirming
                      ? 'Minando Registro en Blockchain...'
                      : 'Registrar Tesis en Smart Contract'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* PANEL 2: MIS PROYECTOS & CERTIFICADOS NFT                         */}
        {/* ================================================================= */}
        {activeTab === 'my-projects' && (
          <div className="space-y-8">
            {/* Header del Autor */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Panel de Investigador / Estudiante</h3>
                  <p className="text-xs font-mono text-slate-500">
                    Billetera activa: {isConnected ? formatAddress(userAddress) : 'No conectada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                    Proyectos Subidos
                  </span>
                  <span className="text-lg font-black text-slate-900">{myProjects.length}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="block text-[11px] text-emerald-800 uppercase font-semibold">
                    NFTs Emitidos
                  </span>
                  <span className="text-lg font-black text-emerald-800">{myNFTs.length}</span>
                </div>
              </div>
            </div>

            {/* Listado de Proyectos Propios */}
            {myProjects.length === 0 ? (
              <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm">
                <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  No hay proyectos registrados con la cuenta actual ({formatAddress(userAddress)})
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Actualmente estás conectado con la billetera{' '}
                  <span className="font-mono text-emerald-800 font-bold">{formatAddress(userAddress)}</span>.
                </p>

                {projects.length > 0 && (
                  <div className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-3xl mx-auto text-left space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <p className="text-slate-900 font-bold flex items-center space-x-1.5 text-sm">
                          <GraduationCap className="w-4 h-4 text-emerald-700" />
                          <span>Proyectos y Certificados en la Universidad ({projects.length})</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Acceso público institucional registrado en la blockchain UPEC
                        </p>
                      </div>
                      <div className="text-[11px] text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
                        Autor registrado: <span className="font-mono font-bold text-slate-900">{formatAddress(projects[0].submitter)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map((proj) => (
                        <div key={proj.id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              #{proj.id}
                            </span>
                            {proj.status === 1 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Certificado NFT #{proj.certificateId}</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>En Evaluación</span>
                              </span>
                            )}
                          </div>

                          <h5 className="text-sm font-bold text-slate-900 line-clamp-1">{proj.title}</h5>
                          <p className="text-xs text-slate-500 line-clamp-2">{proj.description}</p>

                          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                            {proj.status === 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCertId(proj.id);
                                  setActiveTab('certificate');
                                }}
                                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                              >
                                <Award className="w-3.5 h-3.5 text-amber-300" />
                                <span>Ver Certificado de Demostración NFT</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenDocumentViewer(proj, 'pdf')}
                              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs transition shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ver Tesis en PDF para Calificar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudentModal(proj)}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                              title="Editar nombre, cédula y carrera del graduando"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span className="sm:hidden lg:inline">Editar Datos</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                      <span>
                        <strong>Nota Académica:</strong> Tu cuenta actual en MetaMask es <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-bold">{formatAddress(userAddress)}</code>. Como el proyecto fue registrado por <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-bold">{formatAddress(projects[0].submitter)}</code> (Cuenta 1 de prueba), puedes inspeccionar el Certificado de Demostración directamente en la pestaña <strong>Certificado de Demostración NFT</strong> o cambiar de cuenta en MetaMask.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <button
                    onClick={() => setActiveTab('certificate')}
                    className="px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-2"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>Ver Certificado de Demostración NFT</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition border border-slate-200 shadow-sm flex items-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Registrar Nuevo Proyecto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.map((project) => {
                  const isExpanded = expandedProjects[project.id] !== false;
                  const meta = getProjectMetadata(project, projectMetadataMap);
                  const displayStudent = project.studentName || meta.studentName || 'Sin datos personales';
                  const displayScore = project.score || meta.score || '—';
                  const displayCareer = project.career || meta.career || 'Ingeniería en Computación';

                  return (
                    <div
                      key={project.id}
                      className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      {/* Cabecera de la Tarjeta con Despliegue Plegable */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                              #{project.id}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                              Nota: {displayScore}/10
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {project.status === 0 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>{project.tribunalAssigned ? 'En votación' : 'Sin tribunal'}</span>
                              </span>
                            )}
                            {project.status === 1 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aprobada</span>
                              </span>
                            )}
                            {project.status === 2 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                <span>Rechazado</span>
                              </span>
                            )}

                            {/* Botón de Despliegue Plegable */}
                            <button
                              type="button"
                              onClick={() => toggleProjectExpand(project.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title={isExpanded ? 'Plegar detalles' : 'Desplegar detalles'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">
                          {project.title}
                        </h4>

                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{displayStudent}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 truncate">{displayCareer}</span>
                        </div>

                        {/* Contenido Desplegable (para no amontonar) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                              {project.description}
                            </p>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">CID IPFS:</span>
                                <span className="text-emerald-800 font-mono font-semibold truncate max-w-[150px]">
                                  {project.ipfsMetadataCID ? project.ipfsMetadataCID.substring(0, 14) : ''}...
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Votos Tribunal:</span>
                                <span className="font-bold text-slate-900">
                                  {project.votesFor} a favor / {project.votesAgainst} en contra
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botonera de Acciones Integrada */}
                      <div className="p-4 pt-0 space-y-2">
                        {project.status === 1 ? (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-900">
                              <Award className="w-4 h-4 text-amber-500" />
                              <span>Certificado de Demostración NFT #{project.certificateId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCertId(project.id);
                                setActiveTab('certificate');
                              }}
                              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-white font-bold text-xs shadow-sm transition active:scale-95"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              <Award className="w-4 h-4 text-amber-300" />
                              <span>Ver Certificado de Demostración NFT</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-900 font-medium">
                            {project.tribunalAssigned
                              ? `En votación: ${project.votesFor} de 3 votos a favor`
                              : 'Esperando que Secretaría asigne el tribunal'}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDocumentViewer(project, 'pdf')}
                            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-200 font-bold text-xs transition shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Leer Tesis PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudentModal(project)}
                            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Editar Datos</span>
                          </button>
                        </div>

                        {/* Botón para Eliminar Proyecto */}
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold transition"
                          title="Eliminar este proyecto de la base de datos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar Proyecto</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PANEL 3: VOTACIÓN DAO (GOBERNANZA Y MINTEO)                        */}
        {/* ================================================================= */}
        {activeTab === 'vote' && (
          <div className="space-y-6">
            {/* Controles de Búsqueda y Filtro */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Buscar proyectos por título o autor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setDaoFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    daoFilter === 'all'
                      ? 'bg-[#007A3D] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos ({projects.length})
                </button>
                <button
                  onClick={() => setDaoFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    daoFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  En Votación
                </button>
                <button
                  onClick={() => setDaoFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    daoFilter === 'approved'
                      ? 'bg-[#007A3D] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Certificados NFT ({approvedProjects.length})
                </button>
                <button
                  onClick={() => setDaoFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    daoFilter === 'rejected'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Rechazados
                </button>
              </div>
            </div>

            {/* Grid de Proyectos para Votación */}
            {isLoadingProjects ? (
              <div className="text-center py-20 text-slate-500 text-sm">
                Cargando proyectos desde el contrato inteligente...
              </div>
            ) : filteredDaoProjects.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm">
                <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">No hay proyectos para mostrar</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  No se encontraron proyectos con los filtros seleccionados o aún no se ha registrado ninguno.
                </p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm flex items-center space-x-2 mx-auto"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Registrar Primer Proyecto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDaoProjects.map((project) => {
                  const quorumRequired = 3; // aprobación unánime del tribunal
                  const quorumPercentage = Math.min(Math.round((project.votesFor / quorumRequired) * 100), 100);
                  const isExpired = project.tribunalAssigned && now > project.votingDeadline;
                  const canFinalize = project.status === 0 && isExpired;

                  const isExpanded = expandedProjects[`dao_${project.id}`] !== false;
                  const meta = getProjectMetadata(project);
                  const displayStudent = meta.studentName || 'Datos personales no disponibles';
                  const displayScore = meta.score || '';
                  const displayCareer = meta.career || '';

                  const activeAddress = (userAddress || '').toLowerCase();
                  const isTribunalMember = Boolean(
                    activeAddress && project.tribunal?.some((m) => m.address.toLowerCase() === activeAddress)
                  );
                  const userVoteRecord = project.votedByMe ? { support: null } : null;
                  const isSubmitter = Boolean(activeAddress && project.submitter && activeAddress === project.submitter.toLowerCase());
                  const usersByWallet = Object.fromEntries(
                    getDatabaseUsers().filter((u) => u.walletAddress).map((u) => [u.walletAddress.toLowerCase(), u.name])
                  );

                  return (
                    <div
                      key={project.id}
                      className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                              Propuesta #{project.id}
                            </span>
                            {displayScore && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                                Nota: {displayScore}/10
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {project.status === 0 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>{project.tribunalAssigned ? 'En votación' : 'Sin tribunal'}</span>
                              </span>
                            )}
                            {project.status === 1 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aprobada</span>
                              </span>
                            )}
                            {project.status === 2 && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                <span>Rechazado</span>
                              </span>
                            )}

                            {/* Botón de Despliegue Plegable */}
                            <button
                              type="button"
                              onClick={() => toggleProjectExpand(`dao_${project.id}`)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title={isExpanded ? 'Plegar detalles' : 'Desplegar detalles'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2 leading-snug">
                          {project.title}
                        </h4>

                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{displayStudent}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 truncate">{displayCareer}</span>
                        </div>

                        {/* Contenido Desplegable (para no amontonar) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{project.description}</p>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Postulante:</span>
                                <span className="font-mono text-slate-800 font-semibold truncate max-w-[150px]">
                                  {formatAddress(project.submitter)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-500">
                                <span>CID IPFS:</span>
                                {gatewayUrlFor(project.ipfsMetadataCID) ? (
                                  <a
                                    href={gatewayUrlFor(project.ipfsMetadataCID)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-emerald-800 hover:underline flex items-center space-x-1 font-semibold truncate max-w-[150px]"
                                  >
                                    <span>{project.ipfsMetadataCID.substring(0, 10)}...</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="font-mono text-amber-700 font-semibold">Modo demostración (sin IPFS)</span>
                                )}
                              </div>
                            </div>

                            {/* Barra de Quórum DAO */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Votos a favor (se requieren los 3):</span>
                                <span className="font-bold text-slate-900">
                                  {project.votesFor} / {quorumRequired} ({quorumPercentage}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-600 to-amber-500 rounded-full transition-all duration-500"
                                  style={{ width: `${quorumPercentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                                <span className="text-emerald-700 font-semibold">A favor: {project.votesFor}</span>
                                <span className="text-rose-700 font-semibold">En contra: {project.votesAgainst}</span>
                              </div>
                            </div>

                            {/* Tribunal asignado (leído del contrato) */}
                            {project.tribunal?.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                                <div className="text-[10.5px] font-bold text-slate-700">Tribunal asignado:</div>
                                {project.tribunal.map((m) => (
                                  <div key={m.address} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200/80">
                                    <span className="font-semibold text-slate-800 truncate pr-2">
                                      {usersByWallet[m.address.toLowerCase()] || formatAddress(m.address)}
                                    </span>
                                    <span className={`font-bold shrink-0 text-[10.5px] ${m.hasVoted ? 'text-emerald-700' : 'text-slate-400'}`}>
                                      {m.hasVoted ? 'Votó' : 'Pendiente'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botonera de Acciones para Votación */}
                      <div className="p-4 pt-0 space-y-2">
                        {project.status === 0 ? (
                          <>
                            {!project.tribunalAssigned ? (
                              isAdminOnChain ? (
                                <AssignTribunalPanel
                                  project={project}
                                  onAssign={handleAssignTribunal}
                                  disabled={isWritePending || isConfirming}
                                />
                              ) : (
                                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center text-xs font-semibold text-sky-950">
                                  Esperando que Secretaría asigne el tribunal de tres docentes.
                                </div>
                              )
                            ) : userVoteRecord ? (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-1">
                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-950">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Tu voto ya está registrado en la cadena.</span>
                                </div>
                              </div>
                            ) : isSubmitter ? (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-center">
                                <p className="text-xs font-semibold text-amber-950">
                                  Eres el autor de este trabajo. Votan los tres docentes del tribunal.
                                </p>
                              </div>
                            ) : !isTribunalMember ? (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <p className="text-xs font-semibold text-slate-700">
                                  Solo los tres docentes asignados pueden votar. Conecta la billetera de un integrante del tribunal.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleVote(project.id, true)}
                                  disabled={isWritePending || isConfirming || isExpired}
                                  className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 shadow-sm"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>Aprobar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVote(project.id, false)}
                                  disabled={isWritePending || isConfirming || isExpired}
                                  className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  <span>Rechazar</span>
                                </button>
                              </div>
                            )}

                            {canFinalize && (
                              <button
                                type="button"
                                onClick={() => handleFinalize(project.id)}
                                disabled={isWritePending || isConfirming}
                                className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                              >
                                <Clock className="w-4 h-4" />
                                <span>Cerrar por vencimiento del plazo</span>
                              </button>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDocumentViewer(project, 'pdf')}
                                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs transition shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Ver Tesis PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudentModal(project)}
                                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition"
                                title="Editar nombre, cédula y carrera del graduando"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Editar Datos</span>
                              </button>
                            </div>
                          </>
                        ) : project.status === 1 ? (
                          <div className="space-y-2">
                            {userVoteRecord && (
                              <div className="flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-950 text-[11px] font-bold border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Emitiste tu voto calificador: {userVoteRecord.support ? 'Aprobado (Sí)' : 'Rechazado (No)'}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCertId(project.id);
                                setActiveTab('certificate');
                              }}
                              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-sm transition active:scale-95"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              <Award className="w-4 h-4 text-amber-300" />
                              <span>Ver Certificado de Demostración NFT #{project.certificateId}</span>
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenDocumentViewer(project, 'pdf')}
                                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Leer Tesis PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudentModal(project)}
                                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition"
                                title="Editar nombre, cédula y carrera del graduando"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Editar Datos</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDocumentViewer(project, 'pdf')}
                            className="w-full py-2 px-3 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold"
                          >
                            Ver Ficha del Proyecto Rechazado
                          </button>
                        )}

                        {/* Botón para Eliminar Proyecto */}
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold transition"
                          title="Eliminar este proyecto de la base de datos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar Proyecto</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PANEL 4: SMART CONTRACTS UPEC & ARQUITECTURA EVM                   */}
        {/* ================================================================= */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            {/* Header del Módulo de Smart Contracts */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-sm">
                  <FileCode2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <span>Módulo de Smart Contracts & Fábrica de Contratos UPEC</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">
                      Solidity ^0.8.28
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Arquitectura de código descentralizado para automatización de grados, actas de examen y certificados NFT.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0">
                <span className="text-xs font-bold text-slate-700">Nodo Hardhat EVM</span>
                <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-800 mt-0.5">Activo Localhost:8545</span>
              </div>
            </div>

            {/* Contrato Maestro Activo (ProjectRegistry.sol) con Botones de Inspección */}
            <div className="p-6 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                    <FileCode2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span>ProjectRegistry.sol</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                        Activo On-Chain
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">Contrato maestro de titulación y gobernanza DAO desplegado en la UPEC</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-mono">Dirección:</span>
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-800 font-bold">
                    <span>{formatAddress(contractAddress)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(contractAddress)}
                      className="text-slate-500 hover:text-slate-900 p-0.5"
                      title="Copiar dirección del contrato"
                    >
                      {copiedText === contractAddress ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Estándar NFT</span>
                  <span className="text-sm font-bold text-slate-900">ERC-721 URIStorage</span>
                  <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">OpenZeppelin 5.x</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Lenguaje & Compilador</span>
                  <span className="text-sm font-bold text-slate-900">Solidity ^0.8.28</span>
                  <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">EVM Bytecode Optimizado</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gobernanza & Quórum</span>
                  <span className="text-sm font-bold text-slate-900">DAO 3 Votos Mínimos</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Multi-firma Docente On-Chain</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Red Blockchain</span>
                  <span className="text-sm font-bold text-slate-900">Hardhat Localhost</span>
                  <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">Chain ID: 31337</span>
                </div>
              </div>

              {/* Botones de acción directa en el Contrato Maestro */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (approvedProjects[0]) {
                      setSelectedCertificateProject(approvedProjects[0]);
                    } else if (projects[0]) {
                      setSelectedCertificateProject(projects[0]);
                    } else {
                      setActiveTab('certificate');
                    }
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Ver Certificado de Demostración Emitido (#1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedContractCode(CONTRACTS_CATALOG.projectRegistry);
                    setContractViewerTab('code');
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  <FileCode2 className="w-4 h-4 text-amber-400" />
                  <span>Ver Código Solidity (ProjectRegistry.sol)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedContractCode(CONTRACTS_CATALOG.projectRegistry);
                    setContractViewerTab('functions');
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition"
                >
                  <Terminal className="w-4 h-4 text-emerald-700" />
                  <span>Ver Funciones & Métodos</span>
                </button>
              </div>
            </div>

            {/* Guía Técnica: ¿Cómo se crea y sube un Smart Contract? */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    ¿Cómo se crea y sube un Smart Contract a la Blockchain?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ciclo de desarrollo y despliegue técnico para la sustentación de grado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                    1
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Escritura en Solidity</h5>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Se redacta el archivo <code className="text-emerald-800 font-bold">.sol</code> programando las reglas
                    de negocio (ej. validación, quórum de 3 votos, metadatos en IPFS y acuñación de NFTs).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                    2
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Compilación (EVM)</h5>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    El compilador <code className="text-emerald-800 font-bold">solc</code> traduce el código a <strong>Bytecode</strong> binario
                    (que ejecuta la Máquina Virtual de Ethereum) y genera el <strong>ABI</strong> (interfaz JSON de funciones).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                    3
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Transacción de Despliegue</h5>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Se firma una transacción sin destinatario (<code className="text-emerald-800 font-bold">to: null</code>) conteniendo el Bytecode.
                    Los validadores minan el bloque y el contrato recibe su <strong>dirección criptográfica inmutable</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                    4
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Fábricas de Contratos</h5>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Mediante el patrón <strong>Contract Factory</strong>, un Smart Contract madre puede desplegar
                    nuevos contratos hijos automáticamente on-chain para nuevas facultades o promociones.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulador Interactivo de Despliegue de Nuevos Contratos para la UPEC */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileCode2 className="w-5 h-5 text-emerald-700" />
                    <h4 className="text-base font-bold text-slate-900">
                      Simulador de Despliegue de Contratos Modulares UPEC
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Permite a las autoridades o facultades instanciar nuevos contratos inteligentes especializados
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold self-start sm:self-auto">
                  Patrón Factory Pattern
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Datos Principales del Contrato y Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nombre del Smart Contract:</label>
                    <input
                      type="text"
                      value={simContractName}
                      onChange={(e) => setSimContractName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 font-mono text-xs font-bold"
                      placeholder="Ej. ActasDeGradoUPEC"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tipo de Trámite / Estándar EVM:</label>
                    <select
                      value={simContractType}
                      onChange={(e) => handleContractTypeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                    >
                      <option value="actas">Actas de Grado & Defensa Oral (ERC-721 / Pregrado)</option>
                      <option value="posgrado">Títulos de Maestría & Posgrado (ERC-721 / Cuarto Nivel)</option>
                      <option value="pasantias">Certificación de Pasantías & Vinculación (ERC-721)</option>
                      <option value="merito">Mérito Académico & Mejor Egresado (ERC-721 / Condecoración)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Facultad Institucional UPEC:</label>
                    <select
                      value={simFacultyId}
                      onChange={(e) => {
                        const newFacId = e.target.value;
                        setSimFacultyId(newFacId);
                        const facObj = UPEC_FACULTIES.find((f) => f.id === newFacId);
                        if (facObj && facObj.careers.length > 0) {
                          setSimCareer(facObj.careers[0]);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                    >
                      {UPEC_FACULTIES.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.code} - {fac.shortName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Carrera / Programa Académico:</label>
                    <select
                      value={simCareer}
                      onChange={(e) => setSimCareer(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                    >
                      {(UPEC_FACULTIES.find((f) => f.id === simFacultyId) || UPEC_FACULTIES[0]).careers.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Identificación del Graduando (Nombre Completo y Cédula) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-200">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-slate-900 text-xs">Identificación del Graduando / Beneficiario del Contrato</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Nombre Completo del Graduando *</label>
                      <input
                        type="text"
                        value={simStudentName}
                        onChange={(e) => setSimStudentName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                        placeholder="Ej. Benítez Ruales María José"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Cédula de Identidad Ciudadana *</label>
                      <input
                        type="text"
                        value={simStudentId}
                        onChange={(e) => setSimStudentId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 font-mono text-xs font-bold"
                        placeholder="Ej. 0400000002"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Campos Dinámicos Condicionales Según el Tipo de Contrato */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center space-x-2 pb-1.5 border-b border-emerald-200/80">
                    <Medal className="w-4 h-4 text-emerald-800" />
                    <span className="font-bold text-emerald-950 text-xs">
                      Atributos Específicos del Contrato ({CONTRACT_TYPES_CONFIG[simContractType]?.title || simContractType})
                    </span>
                  </div>

                  {/* CASO: Actas de Grado y Defensa Oral */}
                  {simContractType === 'actas' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Calificación Defensa Oral (0-10):</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={simScore}
                          onChange={(e) => setSimScore(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Calificación Trabajo Escrito (0-10):</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={simWrittenScore}
                          onChange={(e) => setSimWrittenScore(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Distinción / Veredicto:</label>
                        <input
                          type="text"
                          value={simMention}
                          onChange={(e) => setSimMention(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium"
                          placeholder="Ej. Magna Cum Laude"
                        />
                      </div>
                    </div>
                  )}

                  {/* CASO: Títulos de Maestría & Posgrado */}
                  {simContractType === 'posgrado' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Calificación Tesis Maestría (0-10):</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={simScore}
                          onChange={(e) => setSimScore(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Código Registro Oficial SENESCYT:</label>
                        <input
                          type="text"
                          value={simSenescytCode}
                          onChange={(e) => setSimSenescytCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs font-bold"
                          placeholder="SENESCYT-1024-2026-98214"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Mención Especializada:</label>
                        <input
                          type="text"
                          value={simMention}
                          onChange={(e) => setSimMention(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium"
                          placeholder="Mención en Inteligencia Artificial"
                        />
                      </div>
                    </div>
                  )}

                  {/* CASO: Pasantías Comunitarias y Prácticas */}
                  {simContractType === 'pasantias' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Horas Reglamentarias Acreditadas:</label>
                        <input
                          type="text"
                          value={simHours}
                          onChange={(e) => setSimHours(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                          placeholder="240 Horas"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Entidad / Empresa Receptora:</label>
                        <input
                          type="text"
                          value={simEntity}
                          onChange={(e) => setSimEntity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium"
                          placeholder="GAD Provincial del Carchi"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Calificación de Desempeño:</label>
                        <input
                          type="text"
                          value={simScore}
                          onChange={(e) => setSimScore(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold"
                          placeholder="10.00 / 10.00 (Sobresaliente)"
                        />
                      </div>
                    </div>
                  )}

                  {/* CASO: Mérito Académico y Mejor Egresado */}
                  {simContractType === 'merito' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Promedio General Acumulado (0-10):</label>
                        <input
                          type="text"
                          value={simScore}
                          onChange={(e) => setSimScore(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                          placeholder="9.94 / 10.00"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Condecoración Oficial:</label>
                        <input
                          type="text"
                          value={simMention}
                          onChange={(e) => setSimMention(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold"
                          placeholder="Medalla Sol Pasto de Oro"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Resolución Consejo Universitario:</label>
                        <input
                          type="text"
                          defaultValue="RES-CU-UPEC-2026-088"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateDeploy}
                  disabled={isSimulatingDeploy}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSimulatingDeploy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Compilando y desplegando contrato en Hardhat...</span>
                    </>
                  ) : (
                    <>
                      <FileCode2 className="w-4 h-4 text-amber-300" />
                      <span>Desplegar Contrato Modular para {simStudentName.split(' ')[0] || 'Graduando'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lista de Contratos Desplegados en la Sesión con Acciones de Certificado y Código */}
              {simulatedContracts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Contratos Desplegados en esta Sesión ({simulatedContracts.length}):</span>
                    </h5>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Haz clic en "Ver Certificado / Acta" para abrir el diploma con los datos completos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {simulatedContracts.map((c) => (
                      <div key={c.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-sm hover:border-emerald-300 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                {c.standard}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">{c.career}</p>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono shrink-0">{c.timestamp}</span>
                        </div>

                        {/* Apartado del Estudiante en la Ficha del Contrato */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px] font-semibold">Graduando / Beneficiario:</span>
                            <span className="font-bold text-slate-900 font-serif">{c.studentName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px] font-semibold">Cédula:</span>
                            <span className="font-mono text-slate-800 font-semibold">{c.studentId}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-500 text-[11px] font-semibold">
                              {c.type === 'pasantias' ? 'Horas Acreditadas:' : c.type === 'posgrado' ? 'Calificación Maestría:' : c.type === 'merito' ? 'Promedio General:' : 'Calificación Grado:'}
                            </span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                              {c.type === 'pasantias' ? c.hours : `${c.score} ${c.type === 'merito' ? '' : '/ 10'}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-emerald-800 font-bold truncate max-w-[180px]" title={c.address}>
                              {formatAddress(c.address)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(c.address)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500"
                              title="Copiar dirección"
                            >
                              {copiedText === c.address ? (
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-slate-500 font-mono text-[11px]">Gas: ~{c.gasUsed?.toLocaleString()}</span>
                        </div>

                        {/* Botonera de Acción para Mirar Contrato o Certificado */}
                        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewContractCertificate(c)}
                            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                            title="Ver el Certificado Oficial NFT generado por este contrato"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-300" />
                            <span>Ver Certificado / Acta</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const catalogItem = CONTRACTS_CATALOG[c.type] || CONTRACTS_CATALOG.actas;
                              setSelectedContractCode({
                                ...catalogItem,
                                name: `${c.name}.sol`,
                                customAddress: c.address,
                                customFaculty: c.faculty,
                                customStandard: c.standard,
                                originalContract: c,
                              });
                              setContractViewerTab('code');
                            }}
                            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition"
                            title="Ver el código fuente Solidity compilado de este contrato"
                          >
                            <FileCode2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Ver Código (.sol)</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>

      {/* ================================================================= */}
      {/* MODAL 1: DIPLOMA ACADÉMICO DIGITAL DE GRADO NFT (UPEC)           */}
      {/* ================================================================= */}
      {selectedCertificateProject && (() => {
        const certMeta = getProjectMetadata(selectedCertificateProject, projectMetadataMap);
        const certProject = {
          ...selectedCertificateProject,
          ...certMeta,
          studentName: certMeta.studentName || selectedCertificateProject.studentName || 'Sin datos personales',
          studentId: certMeta.studentId || selectedCertificateProject.studentId || '—',
          faculty: certMeta.faculty || selectedCertificateProject.faculty || 'FACULTAD DE INDUSTRIAS AGROPECUARIAS Y CIENCIAS AMBIENTALES (FIACA)',
          career: certMeta.career || selectedCertificateProject.career || 'Ingeniería en Computación',
          score: certMeta.score || selectedCertificateProject.score || '—',
          writtenScore: certMeta.writtenScore || selectedCertificateProject.writtenScore || '9.70',
          mention: certMeta.mention || selectedCertificateProject.mention || 'Aprobado con Mención de Honor (Magna Cum Laude)',
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
            <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto">
              {/* Barra superior de control del Modal */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200 print:hidden">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Certificado Académico NFT • {certProject.standard || 'ERC-721'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Token ID: #{certProject.certificateId} • Blockchain UPEC
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditStudentModal(certProject)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95"
                    title="Personalizar o editar datos del graduando para este certificado"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                    <span>Editar Mis Datos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    title="Imprimir Diploma o Guardar en PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Imprimir / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCertificateProject(null)}
                    className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                    title="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* CUERPO DEL DIPLOMA OFICIAL (Imprimible y visual idéntico al documento físico UPEC) */}
              <div className="p-2 sm:p-6 bg-slate-900/10 flex justify-center overflow-x-auto">
                <UPECDiplomaDocument
                  project={certProject}
                  onOpenEditModal={handleOpenEditStudentModal}
                />
              </div>

              {/* Footer del Modal */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-t border-slate-200 print:hidden text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Certificado infalsificable con custodia en Ethereum / Hardhat</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCertificateProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL 2: VISOR DE DOCUMENTO DE TESIS (PARA DOCENTES Y JURADO)     */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* MODAL 2: VISOR INTEGRAL DE TESIS Y DOCUMENTO ACADÉMICO UPEC        */}
      {/* ================================================================= */}
      {selectedDocumentProject && (() => {
        const liveDocProject =
          projects.find((p) => p.id === selectedDocumentProject.id) ||
          simulatedContracts.find((c) => c.id === selectedDocumentProject.id) ||
          selectedDocumentProject;

        const docMeta = getProjectMetadata(liveDocProject, projectMetadataMap);

        const currentDocStudent =
          liveDocProject.studentName ||
          docMeta.studentName ||
          'Sin datos personales';
        const currentDocStudentId =
          liveDocProject.studentId ||
          docMeta.studentId ||
          '—';
        const currentDocFaculty =
          liveDocProject.faculty ||
          docMeta.faculty ||
          'Facultad de Industrias Agropecuarias y Ciencias Ambientales (FIACA)';
        const currentDocCareer =
          liveDocProject.career ||
          docMeta.career ||
          'Ingeniería en Computación';
        const currentDocScore =
          liveDocProject.score ||
          docMeta.score ||
          '9.85';
        const currentDocWrittenScore =
          liveDocProject.writtenScore ||
          docMeta.writtenScore ||
          '9.70';
        const currentDocMention =
          liveDocProject.mention ||
          docMeta.mention ||
          'Aprobado con Mención de Honor (Magna Cum Laude)';
        const currentDocTitle =
          liveDocProject.title ||
          'Arquitectura Descentralizada con Smart Contracts para la Trazabilidad y Certificación de Trabajos de Titulación en la UPEC';
        const currentDocDescription =
          liveDocProject.description ||
          'Desarrollo e implementación de un ecosistema descentralizado en la Blockchain de Ethereum para el registro inmutable de tesis de grado, votación DAO de tribunales docentes y emisión de diplomas NFT con almacenamiento distribuido en IPFS.';

        const activeModalAddress = (userAddress || currentUser?.walletAddress || '').toLowerCase();
        const activeModalEmail = (currentUser?.email || '').toLowerCase();
        const activeModalName = (currentUser?.name || '').toLowerCase();

        const docUserVote = liveDocProject?.voters?.find((v) => {
          if (!v) return false;
          const vVoter = String(v.voter || '').toLowerCase();
          const vName = String(v.voterName || '').toLowerCase();
          if (activeModalAddress && (vVoter === activeModalAddress || vVoter.includes(activeModalAddress))) return true;
          if (activeModalEmail && (vVoter === activeModalEmail || vVoter.includes(activeModalEmail))) return true;
          if (activeModalName && (vName === activeModalName || vVoter === activeModalName)) return true;
          return false;
        });

        const isDocModalSubmitter = (
          (activeModalAddress && liveDocProject.submitter && activeModalAddress === liveDocProject.submitter.toLowerCase()) ||
          (currentUser?.name && currentDocStudent && currentUser.name.toLowerCase().trim() === currentDocStudent.toLowerCase().trim())
        );

        const thesisChapters = [
          {
            id: 0,
            title: 'Portada & Dictamen del Prototipo',
            subtitle: 'Carátula de Demostración UPEC y Acta de Calificación del Tribunal',
          },
          {
            id: 1,
            title: 'Resumen Ejecutivo & Justificación',
            subtitle: 'Abstract y Marco de Reglas Académicas Simuladas',
          },
          {
            id: 2,
            title: 'Capítulo I: Planteamiento & Objetivos',
            subtitle: 'Problemática de Titulación y Objetivos de Investigación',
          },
          {
            id: 3,
            title: 'Capítulo II: Marco Teórico Web3',
            subtitle: 'Blockchain, EVM, Smart Contracts e Inmutabilidad IPFS',
          },
          {
            id: 4,
            title: 'Capítulo III: Smart Contract ProjectRegistry.sol',
            subtitle: 'Arquitectura Criptográfica y Código Verificado',
          },
          {
            id: 5,
            title: 'Capítulo IV: Validación DAO & Quórum 3/3',
            subtitle: 'Pruebas de Consenso de Docentes y Auditoría de Gas',
          },
          {
            id: 6,
            title: 'Capítulo V: Conclusiones & Firmas del Tribunal',
            subtitle: 'Dictamen Aprobatorio y Rúbricas Digitales Criptográficas',
          },
        ];

        const handleModalPdfUpload = async (e) => {
          const file = e.target.files?.[0];
          if (!file || !liveDocProject) return;
          try {
            const url = URL.createObjectURL(file);
            setDocViewerUploadedPdfUrl(url);
            setDocViewerUploadedPdfName(file.name);
            setDocViewerUploadedPdfSize(file.size);
            setDocViewerMode('pdf');

            const cid = liveDocProject.ipfsMetadataCID;
            const projId = liveDocProject.id;
            if (cid) await savePdfToStorage(cid, file);
            if (projId) await savePdfToStorage(`proj_${projId}`, file);

            const pdfData = { url, name: file.name, size: file.size, blob: file };
            setProjectPdfMap((prev) => ({
              ...prev,
              ...(cid ? { [cid]: pdfData } : {}),
              ...(projId ? { [`proj_${projId}`]: pdfData } : {}),
            }));

            setNotification({
              type: 'success',
              message: `Tesis '${file.name}' vinculada y guardada exitosamente para la calificación docente.`,
            });
          } catch (err) {
            console.error('Error al guardar archivo en el visor:', err);
          }
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:fixed">
            <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
              
              {/* Barra de Acento Institucional Tricolor UPEC */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#007A3D] via-[#FBBF24] to-[#007A3D] shrink-0" />

              {/* Cabecera Principal del Visor */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-3.5 bg-slate-100/90 border-b border-slate-200 shrink-0">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                    <img src="/upec-logo.png" alt="Logo UPEC" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Repositorio Institucional UPEC • Visor de Tesis y Documentos
                      </h4>
                      {liveDocProject.status === 1 ? (
                        <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Aprobado por Quórum DAO</span>
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>En Evaluación por Docentes</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800 font-semibold truncate max-w-md">
                      Proyecto #{liveDocProject.id} • {currentDocCareer}
                    </p>
                  </div>
                </div>

                {/* Controles Rápidos y Selector de Modos de Lectura */}
                <div className="flex items-center space-x-2">
                  {/* Selector de Modos de Visualización */}
                  <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-bold text-slate-700">
                    <button
                      type="button"
                      onClick={() => setDocViewerMode('manuscript')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                        docViewerMode === 'manuscript'
                          ? 'bg-white text-emerald-900 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Manuscrito Oficial</span>
                      <span className="sm:hidden">Texto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocViewerMode('pdf')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                        docViewerMode === 'pdf'
                          ? 'bg-white text-emerald-900 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Visor PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocViewerMode('ipfs')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                        docViewerMode === 'ipfs'
                          ? 'bg-white text-emerald-900 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Ficha IPFS</span>
                      <span className="sm:hidden">IPFS</span>
                    </button>
                  </div>

                  {/* Botón Imprimir */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition"
                    title="Imprimir documento"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                  </button>

                  {/* Cerrar Visor */}
                  <button
                    type="button"
                    onClick={() => setSelectedDocumentProject(null)}
                    className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                    title="Cerrar Visor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-barra de Navegación de Capítulos (Visible en Modo Manuscrito) */}
              {docViewerMode === 'manuscript' && (
                <div className="px-5 sm:px-8 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto shrink-0 scrollbar-none text-xs">
                  <span className="text-[11px] font-bold uppercase text-slate-500 shrink-0 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Secciones:</span>
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {thesisChapters.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setDocViewerActiveChapter(ch.id)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                          docViewerActiveChapter === ch.id
                            ? 'bg-[#007A3D] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {ch.id === 0 ? 'Portada & Dictamen' : `Capítulo ${ch.id}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CUERPO PRINCIPAL DEL VISOR DE LECTURA */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:bg-white print:p-0">
                
                {/* ======================================================== */}
                {/* MODO 1: MANUSCRITO OFICIAL DE TESIS UPEC                 */}
                {/* ======================================================== */}
                {docViewerMode === 'manuscript' && (
                  <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-12 space-y-8 font-sans text-slate-800 leading-relaxed print:shadow-none print:border-none print:p-0">
                    
                    {/* Encabezado Formal UPEC */}
                    <div className="text-center space-y-3 pb-6 border-b-2 border-emerald-700/80">
                      <div className="w-20 h-20 mx-auto bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                        <img src="/upec-logo.png" alt="Escudo UPEC" className="w-full h-full object-contain" />
                      </div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase font-serif">
                        Universidad Politécnica Estatal del Carchi
                      </h1>
                      <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider">
                        {currentDocFaculty}
                      </h2>
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                        {currentDocCareer}
                      </h3>
                      <div className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300">
                        Trabajo de Integración Curricular Previo a la Obtención del Título Profesional
                      </div>
                    </div>

                    {/* CAPÍTULO 0: PORTADA, VEREDICTO Y ACTA DE CALIFICACIÓN */}
                    {docViewerActiveChapter === 0 && (
                      <div className="space-y-8 animate-fadeIn">
                        <div className="text-center space-y-4 py-4">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                            Tema de Investigación y Titulación de Grado:
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase font-serif max-w-2xl mx-auto">
                            "{currentDocTitle}"
                          </h2>
                        </div>

                        {/* Ficha de Autoría y Asesoría */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Autor / Graduando:</span>
                            <p className="text-sm font-bold text-slate-900">{currentDocStudent}</p>
                            <p className="text-slate-600 font-mono">C.I.: {currentDocStudentId}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Director de Titulación:</span>
                            <p className="text-sm font-bold text-slate-900">Ing. Roberto Carlos Dávila, Ph.D.</p>
                            <p className="text-slate-600">Asesor Metodológico: Ing. Marcelo Cárdenas, M.Sc.</p>
                          </div>
                          <div className="sm:col-span-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-slate-500 text-[11px]">
                            <span>Lugar y Fecha: Tulcán, Provincia del Carchi - República del Ecuador</span>
                            <span className="font-mono font-bold text-emerald-800">Año Académico 2026</span>
                          </div>
                        </div>

                        {/* CUADRO OFICIAL DE CALIFICACIÓN DEL TRIBUNAL DOCENTE (ESCALA 0 A 10 PUNTOS) */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/60 border-2 border-emerald-600/50 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                            <div className="flex items-center space-x-2">
                              <Award className="w-5 h-5 text-emerald-700" />
                              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                                Acta Oficial de Calificación y Veredicto del Tribunal Evaluador
                              </h4>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#007A3D] text-white text-[11px] font-bold shadow-xs">
                              Escala Oficial 0.00 a 10.00 Puntos
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Defensa y Examen Oral:</span>
                              <span className="text-2xl font-black text-emerald-800">{currentDocScore}</span>
                              <span className="text-xs text-slate-500 block font-bold">/ 10.00 Puntos</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Trabajo Escrito (Manuscrito):</span>
                              <span className="text-2xl font-black text-emerald-800">{currentDocWrittenScore}</span>
                              <span className="text-xs text-slate-500 block font-bold">/ 10.00 Puntos</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#007A3D] text-white shadow-xs">
                              <span className="text-[10px] text-emerald-200 uppercase font-bold block">Promedio Final Ponderado:</span>
                              <span className="text-2xl font-black text-amber-300">
                                {((Number(currentDocScore) + Number(currentDocWrittenScore)) / 2).toFixed(2)}
                              </span>
                              <span className="text-xs text-emerald-100 block font-bold">/ 10.00 Puntos</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[11px] text-emerald-800 font-bold block">Distinción Honorífica Universitaria:</span>
                            <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                              {currentDocMention}
                            </span>
                          </div>
                        </div>

                        {/* Certificación de No-Repudio y Trazabilidad */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                          <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
                            Declaración Institucional de Autoría y Fe Criptográfica:
                          </span>
                          <p className="leading-relaxed text-justify">
                            El estudiante <strong>{currentDocStudent}</strong> certifica la total originalidad y rigor científico del presente trabajo de titulación. El contenido íntegro del manuscrito se encuentra protegido contra modificaciones mediante el protocolo inmutable IPFS con CID <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-emerald-900 font-bold">{selectedDocumentProject.ipfsMetadataCID.substring(0, 24)}...</code> y avalado por el Tribunal Docente en la Blockchain de la UPEC.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 1: RESUMEN EJECUTIVO (ABSTRACT) & JUSTIFICACIÓN */}
                    {docViewerActiveChapter === 1 && (
                      <div className="space-y-6 animate-fadeIn text-justify">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Resumen Ejecutivo (Executive Abstract)
                          </h3>
                          <p className="text-xs text-slate-500">Síntesis académica, contextualización y justificación legal</p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Resumen en Español:</h4>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            {currentDocDescription}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            La presente investigación implementa un ecosistema tecnológico sustentado en redes de contabilidad distribuida (Blockchain) y contratos inteligentes autoejecutables para transformar el proceso de titulación de pregrado y posgrado en la Universidad Politécnica Estatal del Carchi. Se establece un mecanismo colegiado descentralizado (DAO) donde tres docentes evaluadores emiten su voto con firmas criptográficas asimétricas. Una vez alcanzado el quórum obligatorio (3/3 votos afirmativos), el contrato inteligente acuña automáticamente un Certificado de Demostración en token NFT bajo el estándar ERC-721 URIStorage, garantizando la inmutabilidad y la trazabilidad de los títulos de grado en este prototipo experimental.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-900 text-xs block">Palabras Clave:</span>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {['Blockchain', 'Ethereum EVM', 'Smart Contracts', 'DAO de Docentes', 'Quórum 3/3', 'IPFS', 'ERC-721 NFT', 'Titulacion UPEC', 'Reglas Simuladas'].map((tag) => (
                              <span key={tag} className="px-2.5 py-1 rounded-md bg-white border border-slate-300 font-medium text-emerald-900 shadow-2xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Abstract (English):</h4>
                          <p className="text-xs text-slate-600 italic leading-relaxed">
                            "This undergraduate thesis designs and deploys a decentralized academic certification system using Ethereum-compatible Smart Contracts and the InterPlanetary File System (IPFS) at Universidad Politécnica Estatal del Carchi. By incorporating a decentralized autonomous organization (DAO) governance protocol, evaluating professors cryptographically cast their verdict. Upon reaching the mandatory consensus threshold of 3 affirmative votes, an immutable ERC-721 Non-Fungible Token is minted directly to the graduate's verifiable address, ensuring authenticity, transparency, and lifelong verification without intermediaries."
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 2: PLANTEAMIENTO DEL PROBLEMA & OBJETIVOS */}
                    {docViewerActiveChapter === 2 && (
                      <div className="space-y-6 animate-fadeIn text-justify">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Capítulo I: Planteamiento del Problema & Objetivos
                          </h3>
                          <p className="text-xs text-slate-500">Fundamentación de la investigación de grado</p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">1.1 Diagnóstico del Problema:</h4>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            En las instituciones de educación superior tradicionales, los procesos de emisión, registro y verificación de títulos universitarios presentan vulnerabilidades críticas derivadas de la centralización de bases de datos relacionales y el uso de documentación física susceptible de falsificación, pérdida o deterioro. Además, la verificación de autenticidad por parte de empleadores y organismos reguladores (como SENESCYT) suele depender de consultas manuales lentas y propensas a errores.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">1.2 Formulación de la Pregunta de Investigación:</h4>
                          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs sm:text-sm font-semibold text-emerald-950 italic">
                            "¿De qué manera la implementación de una arquitectura basada en Blockchain, Smart Contracts y almacenamiento IPFS permite garantizar la trazabilidad, inmutabilidad y verificación instantánea de los trabajos de titulación y actas de grado en la UPEC?"
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">1.3 Objetivos de la Investigación:</h4>
                          <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                            <p><strong>Objetivo General:</strong> Desarrollar e implementar un sistema descentralizado Web3 sustentado en contratos inteligentes para la gestión, evaluación colegiada por jurado docente y certificación NFT de los trabajos de titulación en la Universidad Politécnica Estatal del Carchi.</p>
                            <p><strong>Objetivos Específicos:</strong></p>
                            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                              <li>Diseñar el modelo de gobernanza DAO con quórum mínimo de 3 votos afirmativos emitidos por el tribunal de docentes evaluadores.</li>
                              <li>Integrar el anclaje criptográfico del manuscrito de tesis en el protocolo IPFS, generando identificadores CID únicos e inalterables.</li>
                              <li>Construir y desplegar contratos inteligentes en Solidity (^0.8.28) que automaticen la acuñación del Diploma NFT ERC-721 al finalizar con éxito la defensa de grado.</li>
                              <li>Validar la eficiencia de consumo de gas y la latencia de confirmación en la red EVM mediante pruebas locales exhaustivas.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 3: MARCO TEÓRICO Y TECNOLOGÍAS WEB3 */}
                    {docViewerActiveChapter === 3 && (
                      <div className="space-y-6 animate-fadeIn text-justify">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Capítulo II: Marco Teórico & Arquitectura Criptográfica
                          </h3>
                          <p className="text-xs text-slate-500">Fundamentos tecnológicos de descentralización y consenso</p>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">2.1 Redes Blockchain y Máquina Virtual de Ethereum (EVM):</h4>
                          <p>
                            Blockchain es un libro de contabilidad digital distribuido, inmutable y criptográficamente asegurado. Ethereum expandió esta tecnología al incorporar la EVM, un entorno de ejecución global Turing completo donde operan los Contratos Inteligentes (Smart Contracts). En la UPEC, la red permite registrar cada fase de la titulación como una transacción auditada públicamente.
                          </p>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">2.2 Preservación en IPFS (InterPlanetary File System):</h4>
                          <p>
                            A diferencia del direccionamiento web tradicional basado en localización (HTTP URL), IPFS utiliza direccionamiento basado en contenido (CID). Cuando el estudiante carga su manuscrito de tesis, se calcula su función hash criptográfica SHA-256 inalterable. Cualquier alteración de un solo bit en el archivo cambiaría por completo el CID, lo cual garantiza matemáticamente la integridad académica del documento.
                          </p>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">2.3 Estándar ERC-721 y Tokens No Fungibles Académicos:</h4>
                          <p>
                            Los diplomas se emiten bajo el estándar ERC-721 con extensión URIStorage. A diferencia de las criptomonedas fungibles, cada token NFT de grado representa un título académico singular e irrepetible, enlazado directamente a la cédula del estudiante, la carrera, la calificación otorgada por el tribunal y los metadatos inmutables de IPFS.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 4: SMART CONTRACT PROJECTREGISTRY.SOL */}
                    {docViewerActiveChapter === 4 && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Capítulo III: Smart Contract Maestro ProjectRegistry.sol
                          </h3>
                          <p className="text-xs text-slate-500">Implementación del código Solidity y funciones clave</p>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                          <p>
                            El contrato <code>ProjectRegistry.sol</code> es el núcleo computacional del sistema. Fue programado en lenguaje Solidity versión ^0.8.28, utilizando librerías auditadas de OpenZeppelin (ERC721URIStorage y Ownable).
                          </p>
                        </div>

                        {/* Visor de Código Solidity Embebido */}
                        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 text-slate-300 text-xs font-mono border-b border-slate-800">
                            <span className="flex items-center space-x-2">
                              <FileCode2 className="w-4 h-4 text-emerald-400" />
                              <span>ProjectRegistry.sol • Fragmento de Lógica del Tribunal</span>
                            </span>
                            <span className="text-emerald-400 font-bold">Solidity ^0.8.28</span>
                          </div>
                          <pre className="p-4 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
{`// Quórum mínimo obligatorio de docentes evaluadores
uint256 public constant MIN_QUORUM = 3;

function vote(uint256 projectId, bool support) external {
    Project storage p = projects[projectId];
    require(p.status == ProjectStatus.Pending, "El proyecto no esta en votacion");
    require(block.timestamp <= p.votingDeadline, "Plazo de votacion expirado");
    require(!hasVoted[projectId][msg.sender], "Docente ya emitio su voto");

    hasVoted[projectId][msg.sender] = true;
    if (support) {
        p.votesFor++;
    } else {
        p.votesAgainst++;
    }
    emit VoteCast(projectId, msg.sender, support, p.votesFor, p.votesAgainst);
}

function finalizeProject(uint256 projectId) external {
    Project storage p = projects[projectId];
    require(p.status == ProjectStatus.Pending, "Ya fue finalizado");
    require(p.votesFor >= MIN_QUORUM, "Quorum insuficiente de docentes");

    _tokenCount++;
    uint256 newTokenId = _tokenCount;
    _safeMint(p.submitter, newTokenId);
    _setTokenURI(newTokenId, string.concat("ipfs://", p.ipfsMetadataCID));

    p.status = ProjectStatus.Approved;
    p.certificateId = newTokenId;
    emit CertificateIssued(projectId, newTokenId, p.submitter, p.ipfsMetadataCID);
}`}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 5: RESULTADOS Y QUÓRUM DAO */}
                    {docViewerActiveChapter === 5 && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Capítulo IV: Resultados, Validación DAO & Quórum
                          </h3>
                          <p className="text-xs text-slate-500">Métricas de desempeño, consumo de gas y consenso docente</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Votos Requeridos:</span>
                            <span className="text-2xl font-black text-slate-900">3 Docentes</span>
                            <span className="text-[10px] text-emerald-800 font-bold block mt-1">Quórum Mínimo UPEC</span>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Votos Emitidos:</span>
                            <span className="text-2xl font-black text-emerald-900">{liveDocProject.votesFor} A Favor</span>
                            <span className="text-[10px] text-slate-500 block mt-1">{liveDocProject.votesAgainst} En Contra</span>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Costo Promedio Gas:</span>
                            <span className="text-2xl font-black text-slate-900">~68,420</span>
                            <span className="text-[10px] text-emerald-800 font-bold block mt-1">Gas por Voto Docente</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-2">
                          <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wide">
                            Trazabilidad del Proceso de Evaluación en Tiempo Real:
                          </span>
                          <p className="text-justify leading-relaxed">
                            Durante los ensayos de estrés realizados en el nodo local Hardhat EVM (Chain ID: 31337), se verificó que el contrato inteligente rechaza de manera determinística cualquier intento de emisión de diploma si no se alcanza el quórum de 3 votos afirmativos emitidos por billeteras autorizadas. La latencia promedio de confirmación fue de 1.2 segundos, validando la factibilidad de adopción institucional inmediata en la UPEC.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CAPÍTULO 6: CONCLUSIONES & FIRMAS DEL TRIBUNAL */}
                    {docViewerActiveChapter === 6 && (
                      <div className="space-y-8 animate-fadeIn">
                        <div className="border-b border-slate-200 pb-3">
                          <h3 className="text-base font-black text-slate-900 uppercase">
                            Capítulo V: Conclusiones, Recomendaciones & Firmas del Tribunal
                          </h3>
                          <p className="text-xs text-slate-500">Dictamen definitivo del jurado calificador de titulación</p>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Conclusiones Principales:</h4>
                          <ul className="list-disc pl-5 space-y-2 text-xs">
                            <li>Se implementó con éxito un sistema Web3 que descentraliza el flujo de titulación en la Universidad Politécnica Estatal del Carchi, eliminando el riesgo de fraude y manipulación de títulos.</li>
                            <li>La integración del estándar ERC-721 y el protocolo de almacenamiento IPFS asegura que el documento de tesis y el acta de grado permanezcan accesibles de forma perpetua sin costos recurrentes de servidores centralizados.</li>
                            <li>El sistema cumple rigurosamente con los lineamientos del Reglamento de Régimen Académico del Consejo de Educación Superior (CES) y la Ley Orgánica de Educación Superior (LOES) del Ecuador.</li>
                          </ul>
                        </div>

                        {/* SECCIÓN FORMAL DE FIRMAS DEL TRIBUNAL DOCENTE */}
                        <div className="pt-8 border-t-2 border-slate-200 space-y-6">
                          <div className="text-center">
                            <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest block">
                              Tribunal Calificador de Grado • Firmas y Aval Criptográfico
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Verificado con Hash SHA-256 e Identidad Digital Blockchain
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-center text-xs">
                            {/* Firma 1: Presidente */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="h-14 flex items-center justify-center border-b border-dashed border-slate-300">
                                <span className="font-serif italic text-emerald-900 font-bold text-sm tracking-wider">
                                  Ing. M. Cárdenas
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 pt-1">Ing. Marcelo Cárdenas, M.Sc.</p>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase">Presidente del Tribunal</p>
                              <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                                VOTO EMITIDO • APROBADO
                              </span>
                            </div>

                            {/* Firma 2: Director */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="h-14 flex items-center justify-center border-b border-dashed border-slate-300">
                                <span className="font-serif italic text-emerald-900 font-bold text-sm tracking-wider">
                                  Dr. Roberto Dávila
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 pt-1">Ing. Roberto Carlos Dávila, Ph.D.</p>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase">Director del Trabajo</p>
                              <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                                VOTO EMITIDO • APROBADO
                              </span>
                            </div>

                            {/* Firma 3: Vocal / Secretaria */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="h-14 flex items-center justify-center border-b border-dashed border-slate-300">
                                <span className="font-serif italic text-emerald-900 font-bold text-sm tracking-wider">
                                  Msc. S. Benavides
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 pt-1">Msc. Silvia Patricia Benavides</p>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase">Vocal Calificador</p>
                              <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                                VOTO EMITIDO • APROBADO
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-100 text-center text-[10px] text-slate-600 font-mono">
                            Sello Institucional Digital • Tulcán, Provincia del Carchi • UPEC Blockchain Node ID: #31337
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* MODO 2: VISOR DE ARCHIVO PDF EMBEBIDO                    */}
                {/* ======================================================== */}
                {docViewerMode === 'pdf' && (
                  <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
                    {docViewerUploadedPdfUrl ? (
                      <div className="space-y-4">
                        {/* Banner Informativo y Controles de la Tesis para los Docentes */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-[#007A3D] text-white flex items-center justify-center shrink-0 shadow-xs">
                              <FileText className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {docViewerUploadedPdfName || 'Documento_Tesis_Oficial.pdf'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-950 font-bold text-[10px]">
                                  Tesis del Estudiante
                                </span>
                              </div>
                              <p className="text-slate-600 text-xs mt-0.5">
                                Autor: <strong className="text-emerald-950">{currentDocStudent}</strong> (C.I. {currentDocStudentId}) • {currentDocCareer}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={docViewerUploadedPdfUrl}
                              download={docViewerUploadedPdfName || 'Tesis_UPEC.pdf'}
                              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-emerald-900 border border-slate-300 font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Descargar PDF</span>
                            </a>
                            <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5">
                              <UploadCloud className="w-3.5 h-3.5 text-amber-300" />
                              <span>Reemplazar / Cambiar PDF</span>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={handleModalPdfUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Visor PDF Nativo Integrado */}
                        <div className="rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-white">
                          <iframe
                            src={docViewerUploadedPdfUrl}
                            className="w-full h-[720px] border-none bg-slate-50"
                            title="Tesis Oficial del Estudiante - Visor de Evaluación UPEC"
                          />
                        </div>

                        {/* Barra de Calificación Rápida para el Docente tras leer la tesis */}
                        {liveDocProject.status === 0 ? (
                          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                            <div className="space-y-1">
                              <span className="font-bold text-amber-950 text-xs block">
                                Tribunal Docente Calificador (Quórum Requerido: 3 Votos):
                              </span>
                              <div className="flex items-center gap-3 text-xs text-slate-700">
                                <span>
                                  Votos a Favor: <strong className="text-emerald-800 font-bold">{liveDocProject.votesFor} / 3</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Votos en Contra: <strong className="text-rose-700 font-bold">{liveDocProject.votesAgainst}</strong>
                                </span>
                                <span>•</span>
                                <span className="text-[11px] text-slate-600">Escala LOES: 0.00 a 10.00 pts</span>
                              </div>
                            </div>
                            {docUserVote ? (
                              <div className="px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center space-x-2">
                                <CheckCircle2 className={`w-4 h-4 ${docUserVote.support ? 'text-emerald-700' : 'text-rose-700'}`} />
                                <span>Tu voto ya fue registrado: {docUserVote.support ? 'Aprobado (A Favor)' : 'Rechazado (En Contra)'}</span>
                              </div>
                            ) : isDocModalSubmitter ? (
                              <div className="px-3.5 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs">
                                🎓 Eres el postulante de esta tesis. La votación corresponde al Tribunal Calificador.
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleVote(liveDocProject.id, true)}
                                  disabled={isWritePending || isConfirming}
                                  className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Aprobar Tesis (A Favor)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVote(liveDocProject.id, false)}
                                  disabled={isWritePending || isConfirming}
                                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  <span>Rechazar (En Contra)</span>
                                </button>
                                {liveDocProject.votesFor >= 3 && (
                                  <button
                                    type="button"
                                    onClick={() => handleFinalize(liveDocProject.id)}
                                    disabled={isWritePending || isConfirming}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Finalizar y Minar Certificado NFT</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : liveDocProject.status === 1 ? (
                          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                              </div>
                              <div>
                                <span className="font-extrabold text-emerald-950 text-xs block">
                                  Tesis Aprobada Oficialmente por el Tribunal DAO ({liveDocProject.votesFor} Votos Favorables)
                                </span>
                                <p className="text-slate-600 text-xs">
                                  El título académico NFT #{liveDocProject.certificateId || 1} y el acta de grado han sido acuñados inmutablemente en la Blockchain.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocumentProject(null);
                                setSelectedCertificateProject(liveDocProject);
                                setActiveTab('certificate');
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition"
                            >
                              Ver Título Oficial NFT
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-center space-x-3 shadow-sm">
                            <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                            <div>
                              <span className="font-extrabold text-rose-950 text-xs block">
                                Tesis Rechazada por Veredicto del Tribunal
                              </span>
                              <p className="text-slate-600 text-xs">
                                El proyecto acumuló votos desfavorables y no alcanzó el quórum mínimo requerido.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-emerald-300 text-center space-y-5 max-w-2xl mx-auto my-6 shadow-sm">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-800 flex items-center justify-center shadow-xs">
                          <UploadCloud className="w-8 h-8 text-emerald-700" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-lg font-bold text-slate-900">
                            Cargar Archivo PDF de Tesis para Lectura Directa
                          </h3>
                          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                            Los docentes evaluadores pueden visualizar el documento PDF completo de la tesis en este panel interactivo con herramientas de zoom, paginación y búsqueda nativas.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                          <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-2">
                            <UploadCloud className="w-4 h-4 text-amber-300" />
                            <span>Examinar Archivo PDF de tu Equipo</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleModalPdfUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setDocViewerMode('manuscript')}
                            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                          >
                            Leer en Modo Manuscrito Digital UPEC
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* MODO 3: FICHA TÉCNICA CRIPTOGRÁFICA & IPFS               */}
                {/* ======================================================== */}
                {docViewerMode === 'ipfs' && (
                  <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 text-xs">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      <h4 className="font-extrabold text-slate-900 text-sm uppercase">
                        Auditoría Criptográfica e Inmutabilidad en IPFS
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Identificador de Contenido Inmutable (CID):</span>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-emerald-900 break-all select-all font-semibold flex items-center justify-between gap-2">
                        <span>{liveDocProject.ipfsMetadataCID}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(liveDocProject.ipfsMetadataCID)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 transition shrink-0 border border-slate-200"
                        >
                          {copiedText === liveDocProject.ipfsMetadataCID ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Billetera del Estudiante (Autor):</span>
                        <span className="font-mono text-emerald-900 font-bold block truncate">{liveDocProject.submitter}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Consenso DAO de Docentes:</span>
                        <span className="font-bold text-slate-900 block">
                          {liveDocProject.votesFor} A Favor / {liveDocProject.votesAgainst} En Contra (Quórum: 3)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href={gatewayUrlFor(liveDocProject.ipfsMetadataCID) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-emerald-800 border border-slate-200 font-semibold text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{gatewayUrlFor(liveDocProject.ipfsMetadataCID) ? 'Abrir en el gateway IPFS' : 'Modo demostración: sin IPFS'}</span>
                      </a>
                      <a
                        href={`https://dweb.link/ipfs/${liveDocProject.ipfsMetadataCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-teal-800 border border-slate-200 font-semibold text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir en Gateway dweb.link</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* PIE DEL VISOR: ACCIONES DE EVALUACIÓN Y NAVEGACIÓN */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-3.5 bg-slate-100 border-t border-slate-200 shrink-0">
                
                {/* Navegación Anterior / Siguiente entre Capítulos */}
                {docViewerMode === 'manuscript' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={docViewerActiveChapter === 0}
                      onClick={() => setDocViewerActiveChapter((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 disabled:opacity-40 transition flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </button>
                    <span className="text-[11px] font-bold text-slate-600">
                      Pág. {docViewerActiveChapter + 1} de {thesisChapters.length}
                    </span>
                    <button
                      type="button"
                      disabled={docViewerActiveChapter === thesisChapters.length - 1}
                      onClick={() => setDocViewerActiveChapter((prev) => Math.min(thesisChapters.length - 1, prev + 1))}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 disabled:opacity-40 transition flex items-center space-x-1"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-medium">
                    Repositorio Digital UPEC • Documento Oficial Verificado
                  </div>
                )}

                {/* Acciones de Votación del Jurado y Diploma */}
                <div className="flex items-center space-x-2">
                  {/* Si el proyecto está en evaluación, el docente puede votar a favor directamente mientras lo lee */}
                  {selectedDocumentProject.status === 0 && isConnected && (
                    <button
                      type="button"
                      onClick={() => handleVote(selectedDocumentProject.id, true)}
                      disabled={isWritePending || isConfirming}
                      className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-amber-300" />
                      <span>Aprobar Tesis (Voto Docente DAO)</span>
                    </button>
                  )}

                  {/* Si ya está aprobado, acceso al Diploma NFT */}
                  {selectedDocumentProject.status === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const proj = selectedDocumentProject;
                        setSelectedDocumentProject(null);
                        setSelectedCertificateProject(proj);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Ver Certificado de Demostración NFT</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDocumentProject(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                  >
                    Cerrar Visor
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL 2.5: PERSONALIZAR Y EDITAR DATOS DEL GRADUANDO EN EL DIPLOMA */}
      {/* ================================================================= */}
      {editingStudentProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto">
            {/* Cabecera del Modal de Edición */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border-b border-amber-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  <Edit3 className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>Personalizar Datos del Graduando</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      UPEC Web3
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 truncate max-w-sm">
                    {editingStudentProject.title || `Proyecto #${editingStudentProject.id}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingStudentProject(null)}
                className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 transition border border-amber-200 shadow-2xs"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso Informativo Institucional */}
            <div className="px-6 py-3 bg-emerald-50/80 border-b border-emerald-200 text-xs text-emerald-950 flex items-start space-x-2.5">
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p>
                Los cambios ingresados actualizarán de forma inmediata tu <strong>Certificado de Demostración NFT</strong>, actas de grado y visor de tesis en pantalla, preservándose de forma permanente en tu navegador.
              </p>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleSaveEditStudent} className="p-6 space-y-4 text-slate-800">
              {/* Campo 1: Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre Completo del Graduando / Titulado <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editStudentName}
                    onChange={(e) => setEditStudentName(e.target.value)}
                    placeholder="Ej. Benítez Ruales María José"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>

              {/* Campo 2: Cédula de Identidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cédula de Identidad (C.I.) o Pasaporte <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                    placeholder="Ej. 0400000002"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>

              {/* Campo 3 & 4: Facultad y Carrera */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Facultad UPEC <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFacultyId}
                    onChange={(e) => {
                      const newFacId = e.target.value;
                      setEditFacultyId(newFacId);
                      const fac = UPEC_FACULTIES.find((f) => f.id === newFacId);
                      if (fac && fac.careers.length > 0) {
                        setEditCareer(fac.careers[0]);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  >
                    {UPEC_FACULTIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} • {f.shortName || f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Carrera Universitaria <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editCareer}
                    onChange={(e) => setEditCareer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  >
                    {(UPEC_FACULTIES.find((f) => f.id === editFacultyId)?.careers || [editCareer]).map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo 5 & 6: Calificación (0-10) y Mención de Honor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Calificación de Grado (0 a 10 pts) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="7.00"
                    max="10.00"
                    required
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    placeholder="9.85"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-sm text-slate-900 font-extrabold focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Escala LOES (Aprobación mín: 7.00/10)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mención de Honor / Distinción
                  </label>
                  <select
                    value={editMention}
                    onChange={(e) => setEditMention(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                  >
                    <option value="Aprobado con Mención de Honor (Magna Cum Laude)">Mención de Honor (Magna Cum Laude)</option>
                    <option value="Aprobado con Calificación Sobresaliente (Summa Cum Laude)">Sobresaliente (Summa Cum Laude)</option>
                    <option value="Aprobado con Felicitación del Tribunal Evaluador">Felicitación del Tribunal</option>
                    <option value="Aprobado por Quórum Unánime (3/3 Votos DAO)">Aprobado por Quórum Unánime</option>
                  </select>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingStudentProject(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Guardar y Actualizar Certificado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: VISOR DE CÓDIGO SOLIDITY E INSPECTOR DE SMART CONTRACTS  */}
      {/* ================================================================= */}
      {selectedContractCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Cabecera del Inspector de Contratos */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileCode2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>{selectedContractCode.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {selectedContractCode.customStandard || selectedContractCode.standard}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">{selectedContractCode.title || 'Smart Contract UPEC'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedContractCode.code)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold transition shadow-sm"
                  title="Copiar código fuente Solidity"
                >
                  {copiedText === selectedContractCode.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedContractCode(null)}
                  className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Banner de acceso directo al Certificado / Diploma */}
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-emerald-950 font-medium">
                ¿Deseas ver el Certificado o Acta emitida por este contrato?
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedContractCode.originalContract) {
                    handleViewContractCertificate(selectedContractCode.originalContract);
                  } else {
                    handleViewContractCertificate({
                      id: 1,
                      name: selectedContractCode.name.replace('.sol', ''),
                      type: 'actas',
                      faculty: 'FIACA • UPEC',
                      address: contractAddress,
                      standard: selectedContractCode.standard,
                    });
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#007A3D] hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Ver Certificado Oficial Generado</span>
              </button>
            </div>

            {/* Pestañas de Vista (Código vs Funciones) */}
            <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50 gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setContractViewerTab('code')}
                className={`py-2 px-1 border-b-2 transition ${
                  contractViewerTab === 'code'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Código Fuente Solidity (.sol)
              </button>
              <button
                type="button"
                onClick={() => setContractViewerTab('functions')}
                className={`py-2 px-1 border-b-2 transition ${
                  contractViewerTab === 'functions'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Métodos & Funciones On-Chain ({selectedContractCode.functions?.length || 0})
              </button>
            </div>

            {/* Cuerpo del Visor de Contrato */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {contractViewerTab === 'code' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                    <pre className="leading-relaxed">{selectedContractCode.code}</pre>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                    <strong>Compilación y Seguridad: </strong> Compilado con <code>solc 0.8.28</code>, optimización de 200 runs y contratos estándar auditados de OpenZeppelin 5.x.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-600 mb-2">
                    Funciones públicas y externas disponibles en la Máquina Virtual de Ethereum (EVM) para este contrato:
                  </p>
                  {selectedContractCode.functions && selectedContractCode.functions.map((fn, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-emerald-800 font-bold text-xs break-all">
                          {fn.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono shrink-0">
                          {fn.gas}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{fn.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del Visor */}
            <div className="flex items-center justify-end px-6 py-4 bg-slate-100 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedContractCode(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} UPEC Web3 - Prototipo Académico de Titulación Web3 • Universidad Politécnica Estatal del Carchi. Reglas Académicas Simuladas.
            </div>
            <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600">
              <span>Contrato ProjectRegistry:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-emerald-800 font-bold">
                {formatAddress(contractAddress)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center sm:text-left leading-relaxed">
            Prototipo desarrollado con fines académicos y de investigación. Los certificados, tokens y transacciones generados no poseen validez institucional ni valor monetario real.
          </p>
        </div>
      </footer>

      {/* Drawer de Configuración y Personalización Visual UPEC */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDatabase={handleResetDatabase}
        projectsCount={projects.length}
        usersCount={getDatabaseUsers().length}
      />

      {/* Modal de Perfil de Usuario UPEC */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
        userAddress={userAddress}
        userProjectsCount={myProjects.length}
        userNftsCount={myNFTs.length}
        theme={currentTheme}
      />

      {/* Modal de Confirmación para Eliminar Proyecto */}
      <DeleteProjectModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        project={projectToDelete}
        onConfirmDelete={handleConfirmDeleteProject}
      />
    </div>
  );
}
