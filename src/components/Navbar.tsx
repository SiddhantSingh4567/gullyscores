import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Trophy,
  Flame,
  Users,
  PlayCircle,
  Download,
  LogIn,
  LogOut,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  Share2,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'live' | 'matches' | 'tournaments' | 'teams' | 'scoring';
  setActiveTab: (tab: 'home' | 'live' | 'matches' | 'tournaments' | 'teams' | 'scoring') => void;
  liveMatchCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, liveMatchCount }) => {
  const { user, userProfile, isAdmin, demoMode, setDemoMode, signIn, signOut } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Demo Mode Notice Bar */}
      {demoMode && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>DEMO MODE ACTIVE: Using realistic street cricket sample data. Changes are local.</span>
          </div>
          <button
            onClick={() => setDemoMode(false)}
            className="text-amber-100 hover:text-white underline text-xs cursor-pointer ml-2"
          >
            Switch to Live Firestore
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveTab('home')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 p-0.5 shadow-lg shadow-emerald-950/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#0A0F1D] rounded-[10px] flex items-center justify-center">
                  <span className="text-xl font-black tracking-tighter text-emerald-400">GS</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                    Gully<span className="text-emerald-400">Score</span>
                  </span>
                  {liveMatchCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span>
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                  Every Run Counts
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'home'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'live'
                    ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Flame className="w-4 h-4 text-emerald-400" />
                Live Matches
              </button>
              <button
                onClick={() => setActiveTab('tournaments')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'tournaments'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Tournaments
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'teams'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Teams
              </button>
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2.5">
              {/* PWA Install Button */}
              {!isInstalled && isInstallable && (
                <button
                  onClick={install}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition"
                  title="Install GullyScore to your phone or desktop"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
              )}

              {/* iOS PWA Prompt */}
              {!isInstalled && isIOS && (
                <button
                  onClick={() => setShowIOSModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Install PWA
                </button>
              )}

              {/* Demo Mode Toggle */}
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                  demoMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Toggle Sample Data Demo"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {demoMode ? 'Demo ON' : 'Try Demo'}
              </button>

              {/* User Profile / Auth */}
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-bold text-slate-200 leading-none">
                      {userProfile?.displayName || user.displayName || 'Scorer'}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400 capitalize">
                      {isAdmin ? 'Platform Admin' : userProfile?.role || 'Organizer'}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}

              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#070b14] px-4 py-3 space-y-2">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between ${
                activeTab === 'home' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
              }`}
            >
              Explore Matches & Tournaments
            </button>
            <button
              onClick={() => {
                setActiveTab('live');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'live' ? 'bg-emerald-950/40 text-emerald-400' : 'text-slate-300'
              }`}
            >
              <Flame className="w-4 h-4 text-emerald-400" />
              Live Matches
              {liveMatchCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] bg-lime-500 text-black font-extrabold">
                  {liveMatchCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('tournaments');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'tournaments' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Tournaments
            </button>
            <button
              onClick={() => {
                setActiveTab('teams');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'teams' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Teams & Squads
            </button>

            {/* Mobile PWA Install */}
            {!isInstalled && isInstallable && (
              <button
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install GullyScore to Home Screen
              </button>
            )}
          </div>
        )}
      </header>

      {/* iOS Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 mb-3">
              <Download className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Install on iPhone / iPad</h3>
            </div>
            <p className="text-sm text-slate-300 space-y-2">
              <span className="block">
                1. Tap the <strong className="text-white">Share</strong> icon at the bottom of
                Safari.
              </span>
              <span className="block">
                2. Scroll down and select{' '}
                <strong className="text-emerald-400">Add to Home Screen</strong>.
              </span>
              <span className="block text-xs text-slate-400 mt-2">
                This enables full-screen standalone scoring without browser bars!
              </span>
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
