import { create } from 'zustand';
import { ContractDocument, ProcessingProgress } from '@/types';

interface AppState {
  documents: ContractDocument[];
  currentDocument: ContractDocument | null;
  isProcessing: boolean;
  processingProgress: ProcessingProgress | null;
  ollamaConnected: boolean;
  ollamaModel: string | null;
  
  setDocuments: (documents: ContractDocument[]) => void;
  addDocument: (document: ContractDocument) => void;
  updateDocument: (id: string, updates: Partial<ContractDocument>) => void;
  removeDocument: (id: string) => void;
  setCurrentDocument: (document: ContractDocument | null) => void;
  setProcessing: (isProcessing: boolean, progress?: ProcessingProgress) => void;
  setOllamaStatus: (connected: boolean, model?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  documents: [],
  currentDocument: null,
  isProcessing: false,
  processingProgress: null,
  ollamaConnected: false,
  ollamaModel: null,
  
  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => set((state) => ({
    documents: [document, ...state.documents],
  })),
  
  updateDocument: (id, updates) => set((state) => ({
    documents: state.documents.map((doc) =>
      doc.id === id ? { ...doc, ...updates } : doc
    ),
    currentDocument: state.currentDocument?.id === id
      ? { ...state.currentDocument, ...updates }
      : state.currentDocument,
  })),
  
  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter((doc) => doc.id !== id),
    currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
  })),
  
  setCurrentDocument: (document) => set({ currentDocument: document }),
  
  setProcessing: (isProcessing, progress) => set({
    isProcessing,
    processingProgress: progress || null,
  }),
  
  setOllamaStatus: (connected, model) => set({
    ollamaConnected: connected,
    ollamaModel: model || null,
  }),
}));
