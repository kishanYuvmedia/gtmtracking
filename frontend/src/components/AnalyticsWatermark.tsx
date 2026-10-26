import React from 'react';

interface AnalyticsWatermarkProps {
  className?: string;
  color?: string;
  opacity?: number;
}

export const AnalyticsWatermark: React.FC<AnalyticsWatermarkProps> = ({
  className = '',
  color = 'currentColor',
  opacity = 0.35,
}) => {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      id="analytics-watermark-graphic"
    >
      <svg
        viewBox="0 0 400 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        style={{ opacity }}
      >
        {/* Trend Line with Connected Circular Nodes */}
        <path
          d="M 50 180 L 130 140 L 220 190 L 320 110"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Node Circles */}
        <circle cx="50" cy="180" r="22" fill={color} />
        <circle cx="130" cy="140" r="22" fill={color} />
        <circle cx="220" cy="190" r="22" fill={color} />
        <circle cx="320" cy="110" r="22" fill={color} />

        {/* Bar Chart Columns */}
        {/* Column 1 */}
        <rect x="52" y="210" width="38" height="110" rx="4" fill={color} />
        {/* Column 2 */}
        <rect x="110" y="170" width="38" height="150" rx="4" fill={color} />
        {/* Column 3 */}
        <rect x="168" y="225" width="38" height="95" rx="4" fill={color} />
        {/* Column 4 */}
        <rect x="226" y="170" width="38" height="150" rx="4" fill={color} />

        {/* Analog Clock / Stopwatch overlay on bottom right */}
        <g id="watermark-clock">
          {/* Outer circle with ticks */}
          <circle
            cx="265"
            cy="245"
            r="60"
            stroke={color}
            strokeWidth="14"
            fill="none"
          />
          {/* Minute tick notches */}
          <line x1="265" y1="190" x2="265" y2="200" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="265" y1="290" x2="265" y2="300" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="210" y1="245" x2="220" y2="245" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="310" y1="245" x2="320" y2="245" stroke={color} strokeWidth="6" strokeLinecap="round" />

          {/* Clock Hands forming "L" */}
          <path
            d="M 265 210 L 265 245 L 295 245"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="265" cy="245" r="7" fill={color} />
        </g>
      </svg>
    </div>
  );
};
