import React from 'react';
import {
  X,
  Palette,
  Type,
  Layers,
  RotateCcw,
  Check,
  ShieldCheck,
  Database,
  Moon,
  Sun,
  Layout,
  Sliders,
  Smartphone,
} from 'lucide-react';
import { THEMES } from '../utils/upecDatabase.js';

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDatabase,
  projectsCount = 0,
  usersCount = 0,
}) {
  if (!isOpen) return null;

  const currentTheme = THEMES[settings.themeId] || THEMES.emerald;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header de la Barra de Configuración */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                  Configuración UPEC
                  <span className="text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Personalización
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Colores, accesibilidad, despliegues y base de datos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar panel de configuración"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo con Opciones */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* 1. SELECCIÓN DE PALETA DE COLORES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600" />
                  Paleta de Color y Tema Visual
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  {currentTheme.name}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Selecciona la apariencia preferida. El cambio se aplica instantáneamente y se guarda de forma permanente.
              </p>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {Object.values(THEMES).map((th) => {
                  const isSelected = settings.themeId === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => onUpdateSettings({ themeId: th.id })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-2 border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-7 h-7 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: th.primary }}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {th.name}
                            {th.isDark && (
                              <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-normal">
                                Oscuro
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {th.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1 pl-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: th.primary }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: th.accent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ORGANIZACIÓN Y DESPLIEGUES (NO AMONTONAR) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-600" />
                Organización de Tarjetas y Despliegues
              </label>
              <p className="text-xs text-slate-500">
                Evita que la interfaz se vea amontonada mediante secciones plegables y acordeones interactivos.
              </p>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div className="pr-3">
                    <div className="text-xs font-semibold text-slate-800">
                      Modo Holgado con Despliegues Plegables
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Muestra la tesis en secciones desplegables limpias (Resumen, Tribunal, Hash IPFS).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!settings.compactMode}
                    onChange={(e) => onUpdateSettings({ compactMode: !e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div className="pr-3">
                    <div className="text-xs font-semibold text-slate-800">
                      Desplegar Detalles Técnicos Automáticamente
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Muestra por defecto el visor completo al abrir la tesis.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoExpandActive}
                    onChange={(e) => onUpdateSettings({ autoExpandActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>

            {/* 3. TAMAÑO DE TEXTO Y ACCESIBILIDAD */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Type className="w-4 h-4 text-emerald-600" />
                Tamaño de Texto y Lectura Académica
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Estándar', desc: '14px' },
                  { id: 'large', label: 'Grande', desc: '16px' },
                  { id: 'xlarge', label: 'Docente+', desc: '18px' },
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontSize: size.id })}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      settings.fontSize === size.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                    }`}
                  >
                    <div className="text-xs">{size.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{size.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. BASE DE DATOS LOCAL Y ESTADO */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Estado de Base de Datos Local
                </label>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Persistente
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-slate-800">{projectsCount}</div>
                  <div className="text-[11px] text-slate-500 font-medium">Proyectos en BD</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-slate-800">{usersCount}</div>
                  <div className="text-[11px] text-slate-500 font-medium">Cuentas Registradas</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onResetDatabase}
                className="w-full mt-2 py-2 px-3 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer Base de Datos a Valores de Fábrica
              </button>
            </div>

          </div>

          {/* Footer del Drawer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              UPEC Web3 v2.4 • Visual Studio Code Ready
            </div>
            <button
              onClick={onClose}
              className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Listo
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
