import React from 'react';
import { ScreenMode } from '../../types';

interface AuthLayoutProps {
  children: React.ReactNode;
  currentScreen: ScreenMode;
  onNavigate: (screen: ScreenMode) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  currentScreen,
  onNavigate,
}) => {
  return (
    <div
      id="auth-standalone-layout"
      className="relative min-h-screen flex items-center justify-center transition-colors duration-300 overflow-hidden p-4 sm:p-6 lg:p-10"
     
    >
      {/* Decorative blurred circles */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,209,10,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,209,10,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(247,244,188,0.4) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {children}
      </div>
    </div>
  );
};
