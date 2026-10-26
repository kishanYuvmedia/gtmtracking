import React, { useState, useEffect, useRef } from 'react';
import { ClickOwlLogo } from '../ClickOwlLogo';
import { AnalyticsWatermark } from '../AnalyticsWatermark';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { ScreenMode } from '../../types';
import { api } from '../../lib/api';

interface MailConfirmationScreenProps {
  onNavigate: (screen: ScreenMode) => void;
}

export const MailConfirmationScreen: React.FC<MailConfirmationScreenProps> = ({
  onNavigate,
}) => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isInvalid, setIsInvalid] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState('');
  const pendingEmail = (() => {
    try { return localStorage.getItem('pendingEmail') || ''; } catch { return ''; }
  })();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const entered = code.join('');
    if (entered.length !== 6) {
      setIsInvalid(true);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyOtp(pendingEmail, entered);
      if (result.error) {
        setIsInvalid(true);
        setError(result.error);
      } else if (result.token) {
        localStorage.setItem('token', result.token);
        setIsVerified(true);
        setTimeout(() => onNavigate('app'), 700);
      }
    } catch (err: any) {
      setIsInvalid(true);
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    if (!pendingEmail) {
      setError('We could not find the email you signed up with. Please sign up again.');
      return;
    }
    setResending(true);
    setError('');
    setNotice('');
    try {
      await api.resendOtp(pendingEmail);
      setIsInvalid(false);
      setCode(['', '', '', '', '', '']);
      setCountdown(300);
      setNotice('A new code is on its way.');
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Could not resend the code');
    } finally {
      setResending(false);
    }
  };

  const toggleSimulateError = () => {
    if (!isInvalid) {
      setIsInvalid(true);
      setCode(['1', '2', '4', '4', '6', '6']);
    } else {
      setIsInvalid(false);
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    }
  };

  const getCodeInputClass = (idx: number) => {
    if (isInvalid) {
      return 'w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-bold bg-white focus:outline-none';
    }
    if (code[idx]) {
      return 'w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-bold border border-[#E7E7E3] focus:outline-none';
    }
    return 'w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-bold bg-[#F7F7F5] border border-border focus:border-[#FFD10A] focus:outline-none transition-all';
  };

  const getCodeInputStyle = (idx: number): React.CSSProperties => {
    if (isInvalid) {
      return { border: '2px solid #C62828', borderRadius: '8px', color: '#171717' };
    }
    if (code[idx]) {
      return { background: '#F0F0F0', border: '1px solid #E7E7E3', borderRadius: '8px', color: '#171717' };
    }
    return { borderRadius: '8px', color: '#171717' };
  };

  return (
    <div id="mail-confirmation-screen-container" className="w-full">
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={toggleSimulateError}
          className="px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all"
          style={{
            borderRadius: '8px',
            border: isInvalid ? '1px solid #C62828' : '1px solid #E7E7E3',
            color: isInvalid ? '#C62828' : '#171717',
            background: isInvalid ? '#FFF5F5' : '#FFFFFF',
          }}
          id="toggle-error-simulation-btn"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{isInvalid ? 'Current: Invalid Code State' : 'Toggle: Simulate Wrong Code'}</span>
        </button>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-12 overflow-hidden transition-all"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '16px',
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
              <p className="text-2xl sm:text-3xl font-normal" style={{ color: '#2A2A2A' }}>
                Welcome to
              </p>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1"
                style={{ color: '#010101' }}
              >
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
        <div
          className="md:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center"
          style={{ background: '#FFFFFF' }}
        >
          <div className="max-w-md mx-auto w-full text-center">
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
              style={{ color: '#010101' }}
            >
              Check Your Mail
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed max-w-xs mx-auto mb-8" style={{ color: '#737373' }}>
              We sent a 6-digit code to <span className="font-semibold break-all" style={{ color: '#010101' }}>{pendingEmail || 'your email'}</span>.
              <br />
              Enter it below to verify your account.
            </p>

            <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-6" id="verification-code-inputs">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputsRef.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={code[idx]}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={getCodeInputClass(idx)}
                  style={getCodeInputStyle(idx)}
                />
              ))}

              <span className="font-bold px-1" style={{ color: '#737373' }}>-</span>

              {[3, 4, 5].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputsRef.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={code[idx]}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={getCodeInputClass(idx)}
                  style={getCodeInputStyle(idx)}
                />
              ))}
            </div>

            <div className="h-8 flex items-center justify-center mb-6">
              {isInvalid ? (
                <p className="text-xs sm:text-sm font-semibold" style={{ color: '#010101' }}>
                  Invalid Code !{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="underline font-bold cursor-pointer transition-colors disabled:opacity-50"
                    style={{ color: '#010101' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#E8B900'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#010101'; }}
                  >
                    {resending ? 'Sending…' : 'Resend ?'}
                  </button>
                </p>
              ) : countdown === 0 ? (
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#737373' }}>
                  Didn&apos;t get it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="underline font-bold cursor-pointer disabled:opacity-50"
                    style={{ color: '#010101' }}
                  >
                    {resending ? 'Sending…' : 'Resend code'}
                  </button>
                </p>
              ) : notice ? (
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#2E7D32' }}>
                  {notice} Resend again in {formatTime(countdown)}
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#737373' }}>
                  Resend code in{' '}
                  <span className="font-bold underline" style={{ color: '#010101' }}>
                    {formatTime(countdown)}
                  </span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerify}
              id="verify-email-submit-btn"
              className="w-full py-3 text-sm font-semibold transition-colors cursor-pointer"
              style={{
                border: '1px solid #E7E7E3',
                borderRadius: '8px',
                color: '#171717',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F7F7F5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isVerified ? (
                <span className="flex items-center justify-center gap-2" style={{ color: '#16803C' }}>
                  <CheckCircle className="w-4 h-4" /> Code Verified!
                </span>
              ) : (
                'Verify Email'
              )}
            </button>

            <p className="text-xs mt-6" style={{ color: '#737373' }}>
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="font-bold underline transition-colors"
                style={{ color: '#010101' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8B900'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#010101'; }}
              >
                Sign Up with different e-mail
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
