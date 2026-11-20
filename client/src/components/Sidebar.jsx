import React, { useState } from 'react';
import {
  LayoutDashboard,
  User,
  FolderKanban,
  FilePlus,
  Vote,
  Award,
  ShieldCheck,
  FileSignature,
  Briefcase,
  Coins,
  ArrowLeftRight,
  History,
  Code2,
  Activity,
  Compass,
  Palette,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Database,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  currentTheme,
  counts = {},
  onOpenProfile,
  onOpenSettings,
  onLogout,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Definición de las secciones estructuradas del Prototipo Académico
  const menuSections = [
    {
      id: 'principal',
      title: 'PRINCIPAL',
      items: [
        {
          id: 'dashboard',
          label: 'Panel de inicio',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'database',
          label: 'Base de datos',
          icon: Database,
          badge: counts.totalProjects !== undefined ? `${counts.totalProjects}` : 'BD',
          badgeColor: 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40',
        },
        {
          id: 'profile',
          label: 'Mi perfil',
          icon: User,
          badge: currentUser?.role === 'admin' ? 'Secretaría' : currentUser?.role === 'docente' ? 'Docente' : 'Estudiante',
          action: onOpenProfile,
        },
      ],
    },
    {
      id: 'titulacion',
      title: 'TITULACIÓN WEB3',
      items: [
        {
          id: 'my-projects',
          label: 'Mis proyectos',
          icon: FolderKanban,
          badge: counts.myProjects !== undefined ? counts.myProjects : null,
        },
        {
          id: 'register',
          label: 'Registrar tesis',
          icon: FilePlus,
          badge: null,
        },
        {
          id: 'vote',
          label: 'Tribunal DAO',
          icon: Vote,
          badge: counts.totalProjects !== undefined ? counts.totalProjects : null,
        },
        {
          id: 'certificate',
          label: 'Certificados NFT',
          icon: Award,
          badge: counts.approvedProjects !== undefined ? counts.approvedProjects : null,
        },
        {
          id: 'verify',
          label: 'Verificación de certificados',
          icon: ShieldCheck,
          badge: null,
        },
      ],
    },
    {
      id: 'contratos',
      title: 'CONTRATOS Y TRANSACCIONES',
      items: [
        {
          id: 'escrow',
          label: 'Contratos de compraventa',
          icon: FileSignature,
          badge: 'Escrow',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        },
        {
          id: 'my-contracts',
          label: 'Mis contratos',
          icon: Briefcase,
          badge: null,
        },
        {
          id: 'token-upect',
          label: 'Moneda UPECT',
          icon: Coins,
          badge: 'ERC-20',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        },
        {
          id: 'transfer',
          label: 'Enviar y recibir tokens',
          icon: ArrowLeftRight,
          badge: null,
        },
        {
          id: 'history',
          label: 'Historial de transacciones',
          icon: History,
          badge: null,
        },
      ],
    },
    {
      id: 'blockchain',
      title: 'BLOCKCHAIN',
      items: [
        {
          id: 'contracts',
          label: 'Smart Contracts',
          icon: Code2,
          badge: null,
        },
        {
          id: 'network',
          label: 'Estado de la red',
          icon: Activity,
          badge: '1337',
        },
        {
          id: 'explorer',
          label: 'Explorador de transacciones',
          icon: Compass,
          badge: null,
        },
      ],
    },
    {
      id: 'configuracion',
      title: 'CONFIGURACIÓN',
      items: [
        {
          id: 'appearance',
          label: 'Tema y apariencia',
          icon: Palette,
          action: onOpenSettings,
        },
        {
          id: 'settings',
          label: 'Configuración',
          icon: Settings,
          action: onOpenSettings,
        },
        {
          id: 'logout',
          label: 'Cerrar sesión',
          icon: LogOut,
          action: onLogout,
          isDanger: true,
        },
      ],
    },
  ];

  const handleItemClick = (item) => {
    if (item.action) {
      item.action();
      if (isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
      return;
    }

    onSelectTab(item.id);
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const primaryColor = currentTheme?.primary || '#007A3D';

  // Contenido interno del Sidebar reutilizable en Desktop y Móvil
  const renderSidebarContent = (collapsed = false) => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800 select-none">
      {/* 1. Cabecera del Sidebar con Logotipo Institucional */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-amber-400">
            <img src="/upec-logo.png" alt="UPEC" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-base tracking-tight">UPEC Web3</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-400 text-slate-950">
                  Demo
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                Prototipo académico
              </span>
            </div>
          )}
        </div>

        {/* Botón de alternancia de colapsado (solo visible en escritorio) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Botón de cerrar (solo en móvil) */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Cuerpo del Menú con Scroll Vertical Suave */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {menuSections.map((section) => (
          <div key={section.id} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center ${
                        collapsed ? 'justify-center px-2' : 'justify-between px-3'
                      } py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'text-white shadow-md font-bold'
                          : item.isDanger
                          ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                      style={
                        isActive
                          ? { backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }
                          : {}
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <IconComponent
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive ? 'text-amber-300 scale-110' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge !== null && item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ml-2 shrink-0 ${
                            item.badgeColor ||
                            (isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {/* Tooltip flotante en modo contraído */}
                    {collapsed && (
                      <div className="fixed left-20 z-50 ml-2 hidden group-hover:flex items-center">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-bold shadow-xl border border-slate-700 whitespace-nowrap flex items-center space-x-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-extrabold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Pie del Menú con Perfil Resumido */}
      {currentUser && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onOpenProfile}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center p-1' : 'space-x-3 p-2'
            } rounded-xl hover:bg-slate-800 transition text-left group`}
            title="Ver mi perfil de usuario"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
              {currentUser.avatar || '👨‍🎓'}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1 truncate">
                <span className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser.role === 'admin'
                    ? 'Secretaría General UPEC'
                    : currentUser.role === 'docente'
                    ? 'Tribunal Docente DAO'
                    : 'Estudiante Graduando'}
                </span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Sidebar para Escritorio (Desktop / Tablet en horizontal) */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 sticky top-28 h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden shadow-xl z-30 ${
          isCollapsed ? 'w-20' : 'w-64 xl:w-72'
        }`}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* 2. Drawer para Móviles / Tablets pequeñas con backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Fondo oscurecido con desenfoque */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Panel deslizante desde la izquierda */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
