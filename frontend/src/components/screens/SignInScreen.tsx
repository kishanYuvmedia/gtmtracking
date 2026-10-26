import React, { useState } from 'react';
import { ClickOwlLogo } from '../ClickOwlLogo';
import { AnalyticsWatermark } from '../AnalyticsWatermark';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { ScreenMode } from '../../types';
import { api } from '../../lib/api';

interface SignInScreenProps {
  onNavigate: (screen: ScreenMode) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSubmitted(true);
    try {
      const result = await api.login(email, password);
      if (result.error) {
        if (String(result.error).toLowerCase().includes('not verified')) {
          localStorage.setItem('pendingEmail', email);
          onNavigate('verify');
          return;
        }
        setError(result.error);
      } else if (result.token) {
        localStorage.setItem('token', result.token);
        onNavigate('app');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };

  return (
    <div id="signin-screen-container" className="w-full">
      <div
        className="grid grid-cols-1 md:grid-cols-12 overflow-hidden rounded-2xl border border-white/50"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        }}
      >
        {/* Left Column */}
        <div
          className="md:col-span-5 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden min-h-[480px]"
          style={{
            background: 'linear-gradient(0deg, rgba(247, 244, 188, 0.7) 0%, rgba(255, 241, 227, 0.7) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <div className="relative z-10 space-y-6">
            <ClickOwlLogo variant="full" size="md" />

            <div className="pt-4">
              <p className="text-2xl sm:text-3xl font-normal text-ink-soft">
                Welcome to
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-ink">
                ClickOwl
              </h1>
            </div>
          </div>

          <div className="relative z-0 mt-8">
            <AnalyticsWatermark
              color="#9ca3af"
              opacity={0.65}
              className="w-full max-w-[280px] mx-auto transform translate-y-4"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-surface">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-ink mb-8">
              Sign In
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  id="signin-email-input"
                  className="input pl-11 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  id="signin-password-input"
                  className="input pl-11 pr-11 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-ink transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => onNavigate('forgot-password')} className="text-xs text-muted hover:text-ink underline">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                id="signin-submit-btn"
                className="btn-primary w-full py-3 text-sm"
              >
                {submitted ? 'Signing In...' : 'Sign In'}
              </button>
            </form>


            <p className="text-center text-xs sm:text-sm mt-6 text-muted">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="font-bold underline text-ink hover:text-brand-hover transition-colors"
              >
                Create an Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
