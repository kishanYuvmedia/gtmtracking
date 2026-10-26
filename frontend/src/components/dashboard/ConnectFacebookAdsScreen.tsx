import React, { useState, useCallback } from 'react';
import { ChevronLeft, Shield, AlertCircle } from 'lucide-react';

interface ConnectFacebookAdsProps {
  onBack: () => void;
  onSave: () => void;
}

interface FieldState {
  value: string;
  touched: boolean;
}

export const ConnectFacebookAdsScreen: React.FC<ConnectFacebookAdsProps> = ({
  onBack,
  onSave,
}) => {
  const [pixelId, setPixelId] = useState<FieldState>({ value: '', touched: false });
  const [accessToken, setAccessToken] = useState<FieldState>({ value: '', touched: false });
  const [testEventCode, setTestEventCode] = useState<FieldState>({ value: '', touched: false });

  const isPixelIdValid = pixelId.value.trim().length > 0;
  const isAccessTokenValid = accessToken.value.trim().length > 0;
  const isFormValid = isPixelIdValid && isAccessTokenValid;

  const handleBlur = (setter: React.Dispatch<React.SetStateAction<FieldState>>) => {
    setter((prev) => ({ ...prev, touched: true }));
  };

  const getFieldClassName = (isValid: boolean, touched: boolean) => {
    const base = 'input';
    if (touched && !isValid) {
      return `${base} border-danger/40 focus:border-danger focus:ring-1 focus:ring-danger/20`;
    }
    return `${base} border-border focus:border-ink/40 focus:ring-1 focus:ring-ink/10 focus:bg-surface`;
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Destinations</span>
      </button>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">Connect Facebook Ads</h1>
            <p className="text-xs text-muted mt-0.5">
              Enter your credentials to establish the connection.
            </p>
          </div>
        </div>

        <div className="bg-bg border border-border rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center">
              <Shield className="w-4 h-4 text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Authenticate with Facebook</p>
              <p className="text-[11px] text-muted mt-0.5">
                Connect your Facebook account to securely access your Pixel and Ads data.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 text-xs font-semibold text-muted border border-border rounded-md bg-surface hover:bg-bg hover:border-ink/20 transition-colors whitespace-nowrap">
            Connect via OAuth
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-4 text-[11px] font-medium text-muted uppercase tracking-wider">OR</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Pixel ID <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={pixelId.value}
              onChange={(e) => setPixelId({ value: e.target.value, touched: pixelId.touched })}
              onBlur={() => handleBlur(setPixelId)}
              placeholder="122334"
              className={getFieldClassName(isPixelIdValid, pixelId.touched)}
            />
            {pixelId.touched && !isPixelIdValid && (
              <p className="flex items-center gap-1 mt-1.5 text-[11px] text-danger">
                <AlertCircle className="w-3 h-3" />
                Pixel ID is required
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Access Token <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={accessToken.value}
              onChange={(e) => setAccessToken({ value: e.target.value, touched: accessToken.touched })}
              onBlur={() => handleBlur(setAccessToken)}
              placeholder="1223"
              autoComplete="off"
              className={getFieldClassName(isAccessTokenValid, accessToken.touched)}
            />
            {accessToken.touched && !isAccessTokenValid && (
              <p className="flex items-center gap-1 mt-1.5 text-[11px] text-danger">
                <AlertCircle className="w-3 h-3" />
                Access Token is required
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Test Event Code
            </label>
            <input
              type="text"
              value={testEventCode.value}
              onChange={(e) => setTestEventCode({ value: e.target.value, touched: testEventCode.touched })}
              onBlur={() => handleBlur(setTestEventCode)}
              placeholder="TEST12345"
              className="input"
            />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <button
            onClick={onSave}
            disabled={!isFormValid}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              isFormValid
                ? 'bg-ink text-white hover:bg-ink-soft'
                : 'bg-border text-muted/60 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
