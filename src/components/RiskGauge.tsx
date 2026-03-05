'use client';

import { clsx } from 'clsx';

interface RiskGaugeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function RiskGauge({ score, size = 'medium' }: RiskGaugeProps) {
  const dimensions = {
    small: { width: 80, stroke: 6, fontSize: 'text-lg' },
    medium: { width: 140, stroke: 10, fontSize: 'text-3xl' },
    large: { width: 200, stroke: 14, fontSize: 'text-5xl' },
  };
  
  const { width, stroke, fontSize } = dimensions[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
  };
  
  const color = getColor();
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={width} className="transform -rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="#2e2e3a"
          strokeWidth={stroke}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color}40)`,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className={clsx(fontSize, 'font-bold font-mono')}
          style={{ color }}
        >
          {score}
        </span>
        {size !== 'small' && (
          <span className="text-[#94a3b8] text-xs mt-1">
            Risk Score
          </span>
        )}
      </div>
    </div>
  );
}
