import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Sun, Moon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(cleanEmail, password);
      } else {
        await login(cleanEmail, password);
      }
    } catch (err) {
      setError(err.message || (isRegister ? 'Registration failed' : 'Invalid email or password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors relative">
      {/* Theme Toggle Button Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 shadow-sm transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-lg shadow-brand-500/25 mb-4 text-white">
            <span className="text-2xl font-black tracking-wider">iS</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-indigo-600 dark:from-white dark:via-brand-300 dark:to-indigo-400 bg-clip-text text-transparent">
            ishot
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Searchable Screenshot Library &bull; Private & Isolated Vault
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl p-8 backdrop-blur-sm transition-colors">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                if (isRegister) handleToggleMode();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isRegister) handleToggleMode();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2 animate-fadeIn">
              <span className="font-semibold flex-shrink-0">&bull;</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                {isRegister && (
                  <span className="text-[11px] text-slate-400">Min 8 characters</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-start space-x-2 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              Your screenshots, OCR text, and AI tags are strictly private and isolated to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
