import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  WriteBatch,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import { ContractDocument, Clause, OllamaAnalysis } from '@/types';
import { z } from 'zod';

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

const SkillNodeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  prompt: z.string().max(5000),
  enabled: z.boolean(),
  children: z.array(z.lazy(() => SkillNodeSchema)),
  parentId: z.string().optional(),
});

function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .substring(0, 5000);
}

function sanitizeSkillTree(tree: SkillNode[]): SkillNode[] {
  return tree.map(node => ({
    ...node,
    name: node.name.substring(0, 100),
    description: node.description.substring(0, 500),
    prompt: sanitizePrompt(node.prompt),
    children: sanitizeSkillTree(node.children),
  }));
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

async function withTransaction<T>(fn: (batch: WriteBatch) => Promise<T>): Promise<T> {
  const batch = writeBatch(db);
  try {
    const result = await fn(batch);
    await batch.commit();
    return result;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

function addToBatch(batch: WriteBatch, ref: DocumentReference, data: Record<string, unknown>): void {
  batch.set(ref, data);
}

function updateInBatch(batch: WriteBatch, ref: DocumentReference, data: Record<string, unknown>): void {
  batch.update(ref, data);
}

function deleteInBatch(batch: WriteBatch, ref: DocumentReference): void {
  batch.delete(ref);
}

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

  await withTransaction(async (batch) => {
    addToBatch(batch, doc(db, DOCUMENTS_COLLECTION, document.id), storedDoc);
  });
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

export async function getDocuments(userId?: string, limit?: number, startAfter?: Timestamp): Promise<ContractDocument[]> {
  let q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('uploadedAt', 'desc'));
  
  if (userId) {
    q = query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId), orderBy('uploadedAt', 'desc'));
  }
  
  if (startAfter) {
    q = query(q, where('uploadedAt', '<', startAfter));
  }
  
  if (limit) {
    q = query(q, limit(limit));
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
  await withTransaction(async (batch) => {
    updateInBatch(batch, doc(db, DOCUMENTS_COLLECTION, id), { status });
  });
}

export async function updateDocumentAnalysis(id: string, analysis: OllamaAnalysis): Promise<void> {
  await withTransaction(async (batch) => {
    updateInBatch(batch, doc(db, DOCUMENTS_COLLECTION, id), { analysis });
  });
}

export async function updateDocumentClauses(id: string, clauses: Clause[], riskScore: number): Promise<void> {
  await withTransaction(async (batch) => {
    updateInBatch(batch, doc(db, DOCUMENTS_COLLECTION, id), { clauses, riskScore });
  });
}

export async function saveDocumentWithClausesAndAnalysis(
  document: ContractDocument,
  clauses: Clause[],
  riskScore: number,
  analysis?: OllamaAnalysis,
  userId?: string
): Promise<void> {
  const storedDoc: StoredDocument = {
    id: document.id,
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedAt: Timestamp.fromDate(document.uploadedAt),
    status: 'analyzed',
    extractedText: document.extractedText,
    riskScore,
    clauses,
    analysis,
    userId,
  };

  const analysisId = `analysis-${document.id}-${Date.now()}`;
  const analysisRef = doc(db, ANALYSES_COLLECTION, analysisId);
  
  await withTransaction(async (batch) => {
    addToBatch(batch, doc(db, DOCUMENTS_COLLECTION, document.id), storedDoc);
    if (analysis) {
      addToBatch(batch, analysisRef, {
        id: analysisId,
        documentId: document.id,
        analysis,
        createdAt: serverTimestamp(),
        model: 'auto',
      });
    }
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await withTransaction(async (batch) => {
    deleteInBatch(batch, doc(db, DOCUMENTS_COLLECTION, id));
  });
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
  if (settings.skillTree) {
    settings.skillTree = sanitizeSkillTree(settings.skillTree);
  }
  
  await withTransaction(async (batch) => {
    updateInBatch(batch, doc(db, SETTINGS_COLLECTION, userId), settings);
  });
}

export function getDefaultSkillTree(): SkillNode[] {
  return DEFAULT_SKILL_TREE;
}

export function flattenSkillTree(tree: SkillNode[]): SkillNode[] {
  const result: SkillNode[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function traverse(nodes: SkillNode[], path: string[] = []): void {
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      
      if (visiting.has(node.id)) {
        throw new Error(`Cycle detected in skill tree: ${[...path, node.id].join(' -> ')}`);
      }
      
      visiting.add(node.id);
      result.push(node);
      
      if (node.children.length > 0) {
        traverse(node.children, [...path, node.id]);
      }
      
      visiting.delete(node.id);
      visited.add(node.id);
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
  const skillPrompts = enabledSkills.map(s => sanitizePrompt(s.prompt)).join('\n\n');
  
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