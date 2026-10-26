import React from 'react';
import { Sun, Moon, UploadCloud, Layers, User as UserIcon, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export function Header({ totalCount = 0, onToggleUpload, isUploadOpen, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-indigo-600 dark:from-white dark:via-brand-300 dark:to-indigo-400 bg-clip-text text-transparent">
              ishot
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Library count */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <Layers className="w-3.5 h-3.5 text-brand-500" />
            <span>
              <strong className="text-slate-800 dark:text-slate-200">{totalCount}</strong>{' '}
              {totalCount === 1 ? 'screenshot' : 'screenshots'}
            </span>
          </div>

          {/* Upload trigger button */}
          <button
            onClick={onToggleUpload}
            type="button"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
              isUploadOpen
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:shadow-brand-500/40'
            }`}
            aria-label="Upload screenshots"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* User Email Pill */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 max-w-[180px] truncate">
              <UserIcon className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
              <span className="truncate" title={user.email}>
                {user.email}
              </span>
            </div>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Logout Button */}
          {user && (
            <button
              onClick={handleLogout}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Log out of ishot"
              aria-label="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
