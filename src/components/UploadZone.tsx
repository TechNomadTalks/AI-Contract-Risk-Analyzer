'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, Image, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
}

export function UploadZone({ onFileSelect, isProcessing }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/tiff',
      ];
      return validTypes.includes(file.type) || 
        file.name.match(/\.(pdf|docx|txt|png|jpg|jpeg|tiff|tif)$/i);
    });
    
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);
  
  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={clsx(
        'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200',
        isDragging 
          ? 'border-[#6366f1] bg-[#6366f1]/10' 
          : 'border-[#2e2e3a] hover:border-[#6366f1]/50 hover:bg-[#12121a]',
        isProcessing && 'opacity-50 pointer-events-none'
      )}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.tiff,.tif"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        {isProcessing ? (
          <Loader2 className="w-12 h-12 text-[#6366f1] animate-spin" />
        ) : (
          <div className="flex gap-3">
            <FileText className="w-10 h-10 text-[#94a3b8]" />
            <Image className="w-10 h-10 text-[#94a3b8]" />
            <Upload className="w-10 h-10 text-[#6366f1]" />
          </div>
        )}
        
        <div>
          <p className="text-[#f8fafc] font-medium mb-1">
            {isProcessing ? 'Processing...' : 'Drop contracts here or click to upload'}
          </p>
          <p className="text-[#94a3b8] text-sm">
            PDF, DOCX, TXT, PNG, JPG, TIFF (max 25MB)
          </p>
        </div>
      </div>
    </div>
  );
}
