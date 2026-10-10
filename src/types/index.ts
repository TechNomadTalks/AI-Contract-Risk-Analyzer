export type DocumentStatus = 'uploading' | 'processing' | 'analyzed' | 'error';
export type RiskLevel = 'high' | 'medium' | 'low';
export type ClauseType = 
  | 'termination'
  | 'liability'
  | 'payment'
  | 'confidentiality'
  | 'intellectual_property'
  | 'force_majeure'
  | 'governing_law'
  | 'warranty'
  | 'assignment'
  | 'amendments'
  | 'other';

export interface Clause {
  id: string;
  documentId: string;
  type: ClauseType;
  text: string;
  startIndex: number;
  endIndex: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  summary: string;
}

export interface ContractDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  status: DocumentStatus;
  extractedText: string;
  riskScore: number;
  clauses: Clause[];
  analysis?: OllamaAnalysis;
}

export interface OllamaAnalysis {
  summary: string;
  recommendations: string[];
  topRisks: string[];
  confidence: number;
}

export interface ProcessingProgress {
  stage: 'upload' | 'ocr' | 'clause_detection' | 'analysis' | 'complete';
  progress: number;
  message: string;
}
