import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { ScreenMode } from '../../types';
import { api } from '../../lib/api';

interface Props { onNavigate: (screen: ScreenMode) => void; }

export const ForgotPasswordScreen: React.FC<Props> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      if (res.error) setError(res.error);
      else setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="forgot-password-screen" className="w-full">
      <div className="max-w-md mx-auto bg-surface border border-border rounded-2xl p-8">
        {sent ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink mb-2">Email Sent</h2>
            <p className="text-muted-foreground mb-6">We sent a reset link to <strong>{email}</strong>.</p>
            <button onClick={() => onNavigate('signin')} className="text-ink hover:underline font-medium">Back to Sign In</button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-ink">Forgot Password</h2>
              <p className="text-muted-foreground mt-1">Enter your email to receive a reset link</p>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="w-5 h-5" />
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input pl-11 focus:ring-2 focus:ring-brand focus:border-transparent" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center mt-6">
              <button onClick={() => onNavigate('signin')} className="text-sm text-ink hover:underline">Back to Sign In</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
