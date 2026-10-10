'use client';

import { useState } from 'react';
import { FileText, List, AlertTriangle, CheckCircle, Loader2, Download } from 'lucide-react';
import { ContractDocument } from '@/types';
import { RiskGauge } from './RiskGauge';
import { ClauseCard } from './ClauseCard';
import { clsx } from 'clsx';
import { downloadAnalysisPDF } from '@/lib/pdf-export';

interface AnalysisPanelProps {
  document: ContractDocument;
}

type Tab = 'overview' | 'clauses' | 'fulltext';

export function AnalysisPanel({ document }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAnalysisPDF(document, document.analysis);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };
  
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'clauses', label: 'Clauses', icon: List },
    { id: 'fulltext', label: 'Full Text', icon: FileText },
  ];
  
  if (document.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 text-[#6366f1] animate-spin" />
        <div className="text-center">
          <h3 className="text-[#f8fafc] font-medium mb-1">Analyzing Contract</h3>
          <p className="text-[#94a3b8] text-sm">Extracting text and detecting clauses...</p>
        </div>
      </div>
    );
  }
  
  if (document.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-[#ef4444]" />
        <div className="text-center">
          <h3 className="text-[#f8fafc] font-medium mb-1">Analysis Failed</h3>
          <p className="text-[#94a3b8] text-sm">Please try uploading the document again.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-[#2e2e3a]">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1]'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center py-4">
              <RiskGauge score={document.riskScore} size="large" />
            </div>
            
            {document.analysis && (
              <div className="space-y-4">
                <div className="bg-[#12121a] rounded-lg p-4">
                  <h4 className="text-[#f8fafc] font-medium mb-2">Summary</h4>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">
                    {document.analysis.summary}
                  </p>
                </div>
                
                {document.analysis.topRisks.length > 0 && (
                  <div className="bg-[#12121a] rounded-lg p-4">
                    <h4 className="text-[#f8fafc] font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                      Key Risks
                    </h4>
                    <ul className="space-y-2">
                      {document.analysis.topRisks.map((risk, index) => (
                        <li 
                          key={index}
                          className="text-[#94a3b8] text-sm flex items-start gap-2"
                        >
                          <span className="text-[#ef4444]">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {document.analysis.recommendations.length > 0 && (
                  <div className="bg-[#12121a] rounded-lg p-4">
                    <h4 className="text-[#f8fafc] font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {document.analysis.recommendations.map((rec, index) => (
                        <li 
                          key={index}
                          className="text-[#94a3b8] text-sm flex items-start gap-2"
                        >
                          <span className="text-[#22c55e]">✓</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#12121a] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#f8fafc]">{document.clauses.length}</div>
                <div className="text-[#94a3b8] text-xs">Clauses Found</div>
              </div>
              <div className="bg-[#12121a] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#ef4444]">
                  {document.clauses.filter(c => c.riskLevel === 'high').length}
                </div>
                <div className="text-[#94a3b8] text-xs">High Risk</div>
              </div>
              <div className="bg-[#12121a] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#f59e0b]">
                  {document.clauses.filter(c => c.riskLevel === 'medium').length}
                </div>
                <div className="text-[#94a3b8] text-xs">Medium Risk</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'clauses' && (
          <div className="space-y-3">
            {document.clauses.length === 0 ? (
              <div className="text-center py-8 text-[#94a3b8]">
                No clauses detected in this document.
              </div>
            ) : (
              document.clauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} />
              ))
            )}
          </div>
        )}
        
        {activeTab === 'fulltext' && (
          <div className="bg-[#0a0a0f] rounded-lg p-4">
            <pre className="text-[#94a3b8] text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {document.extractedText || 'No text extracted.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
