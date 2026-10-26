import React, { useState } from 'react';
import { ClickOwlLogo } from '../ClickOwlLogo';
import { AnalyticsWatermark } from '../AnalyticsWatermark';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import { ScreenMode } from '../../types';

interface SignUpScreenProps {
  onNavigate: (screen: ScreenMode) => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [category, setCategory] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('Please agree to the Terms & Conditions');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const name = email.split('@')[0] || 'User';
      const result = await api.register(name, email, password, businessType, category);
      if (result.error) setError(result.error);
      else {
        localStorage.setItem('pendingEmail', email);
        onNavigate('verify');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="signup-screen-container" className="w-full">
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
              Sign Up
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
                  id="signup-email-input"
                  className="input pl-11 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>

              <div className="relative">
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="input focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  <option value="">Business Type</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Agency">Agency</option>
                  <option value="Local Business">Local Business</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  <option value="">Category</option>
                  <option value="Retail">Retail</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
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
                  id="signup-password-input"
                  className="input pl-11 pr-11 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  id="signup-confirm-password-input"
                  className="input pl-11 pr-11 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-ink transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-border cursor-pointer accent-brand"
                />
                <label htmlFor="terms-checkbox" className="text-xs text-muted">
                  I agree the{' '}
                  <span className="underline font-medium cursor-pointer text-ink hover:text-brand-hover transition-colors">
                    Terms & Conditions
                  </span>
                </label>
              </div>

              <button
                type="submit"
                id="signup-submit-btn"
                className="btn-primary w-full py-3 text-sm mt-3"
              >
                Sign Up
              </button>
            </form>


            <p className="text-center text-xs sm:text-sm mt-6 text-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="font-bold underline text-ink hover:text-brand-hover transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
