import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { ScreenMode } from '../../types';
import { api } from '../../lib/api';

interface Props { onNavigate: (screen: ScreenMode) => void; }

export const ResetPasswordScreen: React.FC<Props> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      if (res.error) setError(res.error);
      else {
        setDone(true);
        setTimeout(() => onNavigate('signin'), 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="reset-password-screen" className="w-full">
      <div className="max-w-md mx-auto bg-surface border border-border rounded-2xl p-8">
        {done ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink mb-2">Password Reset</h2>
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-ink">Reset Password</h2>
              <p className="text-muted-foreground mt-1">Enter your new password</p>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="w-5 h-5" />
                </div>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="input pl-11 focus:ring-2 focus:ring-brand focus:border-transparent" />
              </div>
              <button type="submit" disabled={loading || !token} className="btn-primary w-full py-3 text-sm">
                {loading ? 'Resetting...' : 'Reset Password'}
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
