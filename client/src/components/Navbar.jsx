import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ShieldCheck, PlusCircle, Award } from 'lucide-react';

export default function Navbar({ onOpenRegisterModal }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-white">UPEC</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Web3 DAO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Validación, Trazabilidad & Certificados Digitales
            </p>
          </div>
        </div>

        {/* Acciones y Conexión Web3 */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onOpenRegisterModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Registrar Proyecto</span>
            <span className="sm:hidden">Registrar</span>
          </button>

          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </header>
  );
}
