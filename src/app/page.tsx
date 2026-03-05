'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { Header, UploadZone, DocumentCard, AnalysisPanel } from '@/components';
import { extractText, cleanText } from '@/lib/text-extraction';
import { detectClauses, calculateOverallRiskScore } from '@/lib/clause-detection';
import { analyzeDocument, checkOllamaStatus } from '@/lib/ollama';
import { ContractDocument } from '@/types';
import { FileText, Clock, AlertTriangle } from 'lucide-react';

export default function Home() {
  const {
    documents,
    currentDocument,
    isProcessing,
    setDocuments,
    addDocument,
    updateDocument,
    setCurrentDocument,
    setProcessing,
    setOllamaStatus,
    removeDocument,
  } = useAppStore();

  useEffect(() => {
    const checkOllama = async () => {
      const status = await checkOllamaStatus();
      setOllamaStatus(status.connected, status.model);
    };
    checkOllama();
    
    const interval = setInterval(checkOllama, 30000);
    return () => clearInterval(interval);
  }, [setOllamaStatus]);

  const processDocument = useCallback(async (doc: ContractDocument) => {
    updateDocument(doc.id, { status: 'processing' });
    setProcessing(true, { stage: 'ocr', progress: 0, message: 'Extracting text...' });
    
    try {
      const fileResponse = await fetch(`/api/documents/${doc.id}`);
      const fileBlob = await fileResponse.blob();
      const file = new File([fileBlob], doc.fileName, { type: doc.fileType });
      
      const extracted = await extractText(file, (progress) => {
        setProcessing(true, { stage: 'ocr', progress, message: 'Extracting text...' });
      });
      
      if (!extracted.success) {
        throw new Error(extracted.error || 'Text extraction failed');
      }
      
      const cleanedText = cleanText(extracted.text);
      updateDocument(doc.id, { extractedText: cleanedText });
      
      setProcessing(true, { stage: 'clause_detection', progress: 50, message: 'Detecting clauses...' });
      
      const clauses = detectClauses(doc.id, cleanedText);
      const riskScore = calculateOverallRiskScore(clauses);
      
      updateDocument(doc.id, { clauses, riskScore });
      
      setProcessing(true, { stage: 'analysis', progress: 75, message: 'Analyzing risks...' });
      
      const analysis = await analyzeDocument(clauses);
      
      updateDocument(doc.id, {
        status: 'analyzed',
        analysis,
        clauses: clauses.map(c => ({
          ...c,
          summary: analysis.summary,
        })),
      });
      
      setProcessing(false);
    } catch (error) {
      console.error('Processing error:', error);
      updateDocument(doc.id, { status: 'error' });
      setProcessing(false);
    }
  }, [updateDocument, setProcessing]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    setProcessing(true, { stage: 'upload', progress: 0, message: 'Uploading...' });
    
    for (const file of files) {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newDoc: ContractDocument = {
        id: docId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
        status: 'uploading',
        extractedText: '',
        riskScore: 0,
        clauses: [],
      };
      
      addDocument(newDoc);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentId', docId);
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        updateDocument(docId, { status: 'processing' });
        
        await processDocument(newDoc);
        
        const updatedDoc = useAppStore.getState().documents.find(d => d.id === docId);
        if (updatedDoc) {
          setCurrentDocument(updatedDoc);
        }
      } catch (error) {
        console.error('Upload error:', error);
        updateDocument(docId, { status: 'error' });
      }
    }
    
    setProcessing(false);
  }, [addDocument, updateDocument, setProcessing, processDocument, setCurrentDocument]);

  const handleDeleteDocument = useCallback((id: string) => {
    removeDocument(id);
  }, [removeDocument]);

  const sortedDocuments = [...documents].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />
      
      <main className="pt-16 h-screen flex">
        <aside className="w-80 border-r border-[#2e2e3a] flex flex-col bg-[#0a0a0f]">
          <div className="p-4 border-b border-[#2e2e3a]">
            <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[#94a3b8]" />
              <span className="text-[#94a3b8] text-sm font-medium">Documents</span>
              <span className="text-[#94a3b8] text-xs">({documents.length})</span>
            </div>
            
            {sortedDocuments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-[#2e2e3a] mx-auto mb-2" />
                <p className="text-[#94a3b8] text-sm">No documents yet</p>
                <p className="text-[#2e2e3a] text-xs">Upload a contract to get started</p>
              </div>
            ) : (
              sortedDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isSelected={currentDocument?.id === doc.id}
                  onSelect={() => setCurrentDocument(doc)}
                  onDelete={() => handleDeleteDocument(doc.id)}
                />
              ))
            )}
          </div>
        </aside>
        
        <section className="flex-1 bg-[#0a0a0f]">
          {currentDocument ? (
            <AnalysisPanel document={currentDocument} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366f1]/20 to-[#8b5cf6]/20 flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-[#6366f1]" />
              </div>
              <h2 className="text-[#f8fafc] text-xl font-semibold mb-2">
                Welcome to Contract Sentinel
              </h2>
              <p className="text-[#94a3b8] max-w-md mb-6">
                Upload a contract to analyze potential risks. The AI will extract text, 
                identify key clauses, and provide a risk assessment.
              </p>
              <div className="flex items-center gap-6 text-sm text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span>Tesseract OCR</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
                  <span>Clause Detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <span>Local LLM</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
