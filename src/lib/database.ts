import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ContractDocument, Clause, OllamaAnalysis } from '@/types';

const DOCUMENTS_COLLECTION = 'documents';
const ANALYSES_COLLECTION = 'analyses';
const SETTINGS_COLLECTION = 'settings';

export interface StoredDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Timestamp;
  status: ContractDocument['status'];
  extractedText: string;
  riskScore: number;
  clauses: Clause[];
  analysis?: OllamaAnalysis;
  filePath?: string;
  userId?: string;
}

export interface StoredAnalysis {
  id: string;
  documentId: string;
  analysis: OllamaAnalysis;
  createdAt: Timestamp;
  model: string;
}

export interface UserSettings {
  ollamaUrl: string;
  ollamaModel: string;
  customApiUrl?: string;
  customApiKey?: string;
  useCustomApi: boolean;
  skillTree: SkillNode[];
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
  children: SkillNode[];
  parentId?: string;
}

const DEFAULT_SKILL_TREE: SkillNode[] = [
  {
    id: 'root',
    name: 'Contract Analysis',
    description: 'Root analysis skill',
    prompt: 'You are an expert legal contract analyst.',
    enabled: true,
    children: [
      {
        id: 'risk-identification',
        name: 'Risk Identification',
        description: 'Identify and classify contractual risks',
        prompt: 'Analyze the clause for potential risks. Focus on: unilateral terms, unlimited liability, vague language, unfavorable jurisdiction, automatic renewals, and one-sided termination rights.',
        enabled: true,
        children: [],
        parentId: 'root'
      },
      {
        id: 'compliance-check',
        name: 'Compliance Check',
        description: 'Check for regulatory compliance issues',
        prompt: 'Check for compliance with common regulations: GDPR, CCPA, SOX, HIPAA, industry-specific regulations. Flag any clauses that may violate these.',
        enabled: true,
        children: [],
        parentId: 'root'
      },
      {
        id: 'negotiation-points',
        name: 'Negotiation Points',
        description: 'Identify clauses favorable for negotiation',
        prompt: 'Identify specific clauses that could be negotiated. Provide concrete alternative language suggestions. Focus on: liability caps, notice periods, termination rights, IP ownership, payment terms.',
        enabled: true,
        children: [],
        parentId: 'root'
      },
      {
        id: 'summarization',
        name: 'Executive Summary',
        description: 'Generate executive-level summaries',
        prompt: 'Create a concise executive summary highlighting: overall risk level, top 3 risks, key obligations, and recommended actions. Keep under 200 words.',
        enabled: true,
        children: [],
        parentId: 'root'
      }
    ]
  }
];

export async function saveDocument(document: ContractDocument, userId?: string): Promise<void> {
  const storedDoc: StoredDocument = {
    id: document.id,
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedAt: Timestamp.fromDate(document.uploadedAt),
    status: document.status,
    extractedText: document.extractedText,
    riskScore: document.riskScore,
    clauses: document.clauses,
    analysis: document.analysis,
    userId,
  };

  await setDoc(doc(db, DOCUMENTS_COLLECTION, document.id), storedDoc);
}

export async function getDocument(id: string): Promise<ContractDocument | null> {
  const docRef = doc(db, DOCUMENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data() as StoredDocument;
  return {
    id: data.id,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    uploadedAt: data.uploadedAt.toDate(),
    status: data.status,
    extractedText: data.extractedText,
    riskScore: data.riskScore,
    clauses: data.clauses,
    analysis: data.analysis,
  };
}

export async function getDocuments(userId?: string): Promise<ContractDocument[]> {
  let q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('uploadedAt', 'desc'));
  
  if (userId) {
    q = query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId), orderBy('uploadedAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data() as StoredDocument;
    return {
      id: data.id,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      uploadedAt: data.uploadedAt.toDate(),
      status: data.status,
      extractedText: data.extractedText,
      riskScore: data.riskScore,
      clauses: data.clauses,
      analysis: data.analysis,
    };
  });
}

export async function updateDocumentStatus(id: string, status: ContractDocument['status']): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, id), { status });
}

export async function updateDocumentAnalysis(id: string, analysis: OllamaAnalysis): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, id), { analysis });
}

export async function updateDocumentClauses(id: string, clauses: Clause[], riskScore: number): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, id), { clauses, riskScore });
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteDoc(doc(db, DOCUMENTS_COLLECTION, id));
}

export async function saveAnalysis(documentId: string, analysis: OllamaAnalysis, model: string): Promise<void> {
  const analysisId = `analysis-${documentId}-${Date.now()}`;
  await setDoc(doc(db, ANALYSES_COLLECTION, analysisId), {
    id: analysisId,
    documentId,
    analysis,
    createdAt: serverTimestamp(),
    model,
  });
}

export async function getSettings(userId: string): Promise<UserSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return {
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.1:8b',
      useCustomApi: false,
      skillTree: DEFAULT_SKILL_TREE,
    };
  }
  
  return docSnap.data() as UserSettings;
}

export async function saveSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, userId), settings, { merge: true });
}

export function getDefaultSkillTree(): SkillNode[] {
  return DEFAULT_SKILL_TREE;
}

export function flattenSkillTree(tree: SkillNode[]): SkillNode[] {
  const result: SkillNode[] = [];
  
  function traverse(nodes: SkillNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return result;
}

export function getEnabledSkills(tree: SkillNode[]): SkillNode[] {
  return flattenSkillTree(tree).filter(n => n.enabled);
}

export function buildPromptFromSkills(skills: SkillNode[], clauseText: string, clauseType: string): string {
  const enabledSkills = getEnabledSkills(skills);
  const skillPrompts = enabledSkills.map(s => s.prompt).join('\n\n');
  
  return `${skillPrompts}

Clause Type: ${clauseType}
Clause Text:
${clauseText}

Provide your analysis in JSON format:
{
  "summary": "2-3 sentence summary of the clause and its implications",
  "riskFactors": ["specific risk factor 1", "specific risk factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.0-1.0
}

Only respond with valid JSON.`;
}