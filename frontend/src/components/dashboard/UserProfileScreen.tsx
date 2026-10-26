import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Mail, Lock, Save, Check } from 'lucide-react';

interface UserProfileProps {
  onBack: () => void;
  onLogout: () => void;
}

export const UserProfileScreen: React.FC<UserProfileProps> = ({ onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [category, setCategory] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProfile().then((res: any) => {
      if (res.user) {
        setName(res.user.name || '');
        setEmail(res.user.email || '');
        setBusinessType(res.user.business_type || '');
        setCategory(res.user.category || '');
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setError('');
    try {
      await api.updateProfile({ name, business_type: businessType, category });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return;
    setError('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    }
  };


  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">Profile Settings</h1>
        <button
          onClick={onLogout}
          className="px-3.5 py-1.5 text-xs font-semibold text-danger border border-danger/20 rounded-md hover:bg-danger/5 transition-colors"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-5 pb-0">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-ink flex items-center justify-center">
              <span className="text-white text-xl font-bold">{name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'U'}</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">{name || 'User'}</h2>
              <p className="text-xs text-muted">{email}</p>
            </div>
          </div>
        </div>

        <div className="px-5 border-b border-border">
          <div className="flex gap-0">
            {(['profile', 'password'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
                  activeTab === tab
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab === 'profile' ? 'Profile' : 'Change Password'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-[400px]">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="input"
                >
                  <option value="">Select business type</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Agency">Agency</option>
                  <option value="Local Business">Local Business</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  <option value="">Select category</option>
                  <option value="Retail">Retail</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ink rounded-md hover:bg-ink-soft transition-colors"
                >
                  {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saved ? 'Saved' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-4 max-w-[400px]">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-9"
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-danger mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                    currentPassword && newPassword && confirmPassword && newPassword === confirmPassword
                      ? 'text-white bg-ink hover:bg-ink-soft'
                      : 'text-muted bg-border cursor-not-allowed'
                  }`}
                >
                  {saved ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {saved ? 'Updated' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
