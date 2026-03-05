'use client';

import { FileText, Clock, AlertTriangle, CheckCircle, Loader2, Trash2, Eye } from 'lucide-react';
import { ContractDocument, DocumentStatus } from '@/types';
import { clsx } from 'clsx';

interface DocumentCardProps {
  document: ContractDocument;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const statusConfig: Record<DocumentStatus, { icon: React.ElementType; label: string; color: string }> = {
  uploading: { icon: Loader2, label: 'Uploading', color: '#94a3b8' },
  processing: { icon: Loader2, label: 'Processing', color: '#6366f1' },
  analyzed: { icon: CheckCircle, label: 'Analyzed', color: '#22c55e' },
  error: { icon: AlertTriangle, label: 'Error', color: '#ef4444' },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ document, isSelected, onSelect, onDelete }: DocumentCardProps) {
  const status = statusConfig[document.status];
  const StatusIcon = status.icon;
  
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative p-4 rounded-lg cursor-pointer transition-all duration-200',
        isSelected 
          ? 'bg-[#1a1a24] border border-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
          : 'bg-[#12121a] border border-[#2e2e3a] hover:border-[#6366f1]/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={clsx(
          'p-2 rounded-lg',
          isSelected ? 'bg-[#6366f1]/20' : 'bg-[#1a1a24]'
        )}>
          <FileText className={clsx(
            'w-5 h-5',
            isSelected ? 'text-[#6366f1]' : 'text-[#94a3b8]'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-[#f8fafc] font-medium text-sm truncate mb-1">
            {document.fileName}
          </h3>
          
          <div className="flex items-center gap-2 text-xs text-[#94a3b8] mb-2">
            <Clock className="w-3 h-3" />
            <span>{formatDate(document.uploadedAt)}</span>
            <span>•</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span 
              className="flex items-center gap-1 text-xs"
              style={{ color: status.color }}
            >
              <StatusIcon className={clsx('w-3 h-3', document.status === 'processing' && 'animate-spin')} />
              {status.label}
            </span>
            
            {document.status === 'analyzed' && (
              <span className={clsx(
                'text-xs font-medium px-2 py-0.5 rounded',
                document.riskScore >= 70 ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                document.riskScore >= 40 ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                'bg-[#22c55e]/20 text-[#22c55e]'
              )}>
                Risk: {document.riskScore}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="p-1.5 rounded bg-[#1a1a24] text-[#94a3b8] hover:text-[#6366f1] transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded bg-[#1a1a24] text-[#94a3b8] hover:text-[#ef4444] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
