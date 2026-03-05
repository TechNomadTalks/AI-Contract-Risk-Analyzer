'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Clause } from '@/types';
import { getRiskLevelColor, getRiskLevelLabel } from '@/lib/ollama';
import { getClauseTitle } from '@/lib/clause-detection';
import { clsx } from 'clsx';

interface ClauseCardProps {
  clause: Clause;
  onClick?: () => void;
}

const riskIcons = {
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
};

export function ClauseCard({ clause, onClick }: ClauseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const RiskIcon = riskIcons[clause.riskLevel];
  const riskColor = getRiskLevelColor(clause.riskLevel);
  
  return (
    <div 
      className={clsx(
        'rounded-lg border transition-all duration-200',
        clause.riskLevel === 'high' ? 'border-[#ef4444]/30 bg-[#ef4444]/5' :
        clause.riskLevel === 'medium' ? 'border-[#f59e0b]/30 bg-[#f59e0b]/5' :
        'border-[#22c55e]/30 bg-[#22c55e]/5'
      )}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${riskColor}20` }}
          >
            <RiskIcon className="w-4 h-4" style={{ color: riskColor }} />
          </div>
          
          <div>
            <h4 className="text-[#f8fafc] font-medium text-sm">
              {getClauseTitle(clause.type)}
            </h4>
            <span 
              className="text-xs font-medium"
              style={{ color: riskColor }}
            >
              {getRiskLevelLabel(clause.riskLevel)} Risk
            </span>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#94a3b8]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#94a3b8]" />
        )}
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#2e2e3a]">
          <div className="pt-4 space-y-3">
            <div>
              <h5 className="text-[#94a3b8] text-xs uppercase tracking-wider mb-1">
                Extracted Text
              </h5>
              <p className="text-[#f8fafc] text-sm leading-relaxed font-mono bg-[#0a0a0f] p-3 rounded">
                {clause.text}
              </p>
            </div>
            
            {clause.riskFactors.length > 0 && (
              <div>
                <h5 className="text-[#94a3b8] text-xs uppercase tracking-wider mb-1">
                  Risk Factors
                </h5>
                <ul className="space-y-1">
                  {clause.riskFactors.map((factor, index) => (
                    <li 
                      key={index}
                      className="flex items-center gap-2 text-[#f8fafc] text-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {clause.summary && (
              <div>
                <h5 className="text-[#94a3b8] text-xs uppercase tracking-wider mb-1">
                  AI Analysis
                </h5>
                <p className="text-[#f8fafc] text-sm leading-relaxed">
                  {clause.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
