export type ScreenMode = 'signin' | 'signup' | 'verify' | 'forgot-password' | 'reset-password' | 'dashboard' | 'app';

export interface ClickInsight {
  id: string;
  x: number;
  y: number;
  label: string;
  timestamp: string;
  score: number;
}

export interface MetricCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  period: string;
  iconName: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}
